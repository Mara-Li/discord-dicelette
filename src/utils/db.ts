import { type StatisticalTemplate, verifyTemplateValue } from "@dicelette/core";
import type {
	PersonnageIds,
	Settings,
	Translation,
	UserData,
	UserRegistration,
} from "@interface";
import { ln } from "@localization";
import type { EClient } from "@main";
import { embedError, haveAccess, reply, searchUserChannel } from "@utils";
import { ensureEmbed, getEmbeds, parseEmbedFields } from "@utils/parse";
import {
	type BaseInteraction,
	type ButtonInteraction,
	CategoryChannel,
	type CommandInteraction,
	type CommandInteractionOptionResolver,
	type Embed,
	type Locale,
	type Message,
	type ModalSubmitInteraction,
} from "discord.js";
import "standardize";

/**
 * Get the guild template when clicking on the "registering user" button or when submiting
 * @param interaction {ButtonInteraction}
 */
export async function getTemplate(
	interaction: ButtonInteraction | ModalSubmitInteraction
): Promise<StatisticalTemplate | undefined> {
	const template = interaction.message?.attachments.first();
	if (!template) return;
	const res = await fetch(template.url).then((res) => res.json());
	return verifyTemplateValue(res);
}

export function serializeName(
	userStatistique: UserData | undefined,
	charName: string | undefined
) {
	const serializedNameDB = userStatistique?.userName?.standardize(true);
	const serializedNameQueries = charName?.standardize(true);
	const selectedCharByQueries =
		serializedNameDB !== serializedNameQueries ||
		(serializedNameQueries && serializedNameDB?.includes(serializedNameQueries));
	return selectedCharByQueries;
}

export async function getDatabaseChar(
	interaction: CommandInteraction,
	client: EClient,
	t: Translation,
	strict = true
) {
	const options = interaction.options as CommandInteractionOptionResolver;
	const guildData = client.settings.get(interaction.guildId as string);
	const ul = ln(interaction.locale as Locale);
	if (!guildData) {
		await reply(interaction, { embeds: [embedError(ul("error.noTemplate"), ul)] });
		return undefined;
	}
	const user = options.getUser(t("display.userLowercase"));
	let charName = options.getString(t("common.character"))?.toLowerCase();
	if (charName?.includes(ul("common.default").toLowerCase())) charName = undefined;

	if (!user && charName) {
		//get the character data in the database
		const allUsersData = guildData.user;
		const allUsers = Object.entries(allUsersData);
		for (const [user, data] of allUsers) {
			const userChar = data.find((char) => {
				return char.charName?.subText(charName, strict);
			});
			if (userChar) {
				return {
					[user as string]: userChar,
				};
			}
		}
	}
	const userData = client.settings.get(
		interaction.guild!.id,
		`user.${user?.id ?? interaction.user.id}`
	);
	let findChara = userData?.find((char) => {
		char.charName?.subText(charName, strict);
	});
	if (!findChara) findChara = userData?.[0];
	if (!findChara) {
		return undefined;
	}
	return {
		[user?.id ?? interaction.user.id]: findChara,
	};
}

/**
 * Get the statistical Template using the database templateID information
 * @param interaction {ButtonInteraction | ModalSubmitInteraction}
 */
export async function getTemplateWithDB(
	interaction: ButtonInteraction | ModalSubmitInteraction | CommandInteraction,
	enmap: Settings
) {
	if (!interaction.guild) return;
	const guild = interaction.guild;
	const templateID = enmap.get(interaction.guild.id, "templateID");
	const ul = ln(interaction.locale);
	if (!enmap.has(interaction.guild.id) || !templateID)
		throw new Error(ul("error.noGuildData", { server: interaction.guild.name }));

	const { channelId, messageId } = templateID;
	const channel = await guild.channels.fetch(channelId);
	if (!channel || channel instanceof CategoryChannel) return;
	try {
		const message = await channel.messages.fetch(messageId);
		const template = message.attachments.first();
		if (!template) throw new Error(ul("error.noTemplate"));
		const res = await fetch(template.url).then((res) => res.json());
		return verifyTemplateValue(res);
	} catch (error) {
		if ((error as Error).message === "Unknown Message")
			throw new Error(ul("error.noTemplateId", { channelId, messageId }));
		throw error;
	}
}

/**
 * Create the UserData starting from the guildData and using a userId
 * @param guildData {GuildData}
 * @param userId {string}
 * @param guild {Guild}
 * @param interaction {BaseInteraction}
 * @param charName {string}
 * @param integrateCombinaison {boolean=true}
 * @param allowAccess {boolean=true} Allow to access the private channel (only used by {@link displayUser})
 */
export async function getUserFromMessage(
	guildData: Settings,
	userId: string,
	interaction: BaseInteraction,
	charName?: string | null,
	options?: {
		integrateCombinaison?: boolean;
		allowAccess?: boolean;
		skipNotFound?: boolean;
		fetchAvatar?: boolean;
		fetchChannel?: boolean;
	}
) {
	if (!options)
		//biome-ignore lint/style/noParameterAssign: We need to assign a default value
		options = { integrateCombinaison: true, allowAccess: true, skipNotFound: false };
	const { integrateCombinaison, allowAccess, skipNotFound } = options;
	const ul = ln(interaction.locale);
	const guild = interaction.guild;
	const user = guildData.get(guild!.id, `user.${userId}`)?.find((char) => {
		return char.charName?.subText(charName);
	});
	if (!user) return;
	const userMessageId: PersonnageIds = {
		channelId: user.messageId[1],
		messageId: user.messageId[0],
	};
	const thread = await searchUserChannel(
		guildData,
		interaction,
		ul,
		userMessageId.channelId
	);
	if (!thread) throw new Error(ul("error.noThread"));
	if (user.isPrivate && !allowAccess && !haveAccess(interaction, thread.id, userId)) {
		throw new Error(ul("error.private"));
	}
	try {
		const message = await thread.messages.fetch(userMessageId.messageId);
		return getUserByEmbed(
			message,
			ul,
			undefined,
			integrateCombinaison,
			options.fetchAvatar,
			options.fetchChannel
		);
	} catch (error) {
		if (!skipNotFound) throw new Error(ul("error.user"), { cause: "404 not found" });
	}
}

/**
 * Register an user in the database
 * @param userID {string}
 * @param interaction {BaseInteraction}
 * @param msgId {string}
 * @param thread {ThreadChannel}
 * @param charName {string|undefined}
 * @param damage {string[]|undefined}
 * @param deleteMsg {boolean=true} delete the old message if needed (overwriting user)
 * @returns
 */
export async function registerUser(
	userData: UserRegistration,
	interaction: BaseInteraction,
	enmap: Settings,
	deleteMsg: boolean | undefined = true,
	errorOnDuplicate: boolean | undefined = false
) {
	const { userID, charName, msgId, isPrivate } = userData;
	const ids: PersonnageIds = { channelId: msgId[1], messageId: msgId[0] };
	let { damage } = userData;
	if (!interaction.guild) return;
	const guildData = enmap.get(interaction.guild.id);
	if (!guildData) return;
	if (!guildData.user) guildData.user = {};
	if (
		damage &&
		guildData.templateID.damageName &&
		guildData.templateID.damageName.length > 0
	) {
		//filter the damage list and remove the guildData.templateID.damageName
		damage = damage.filter((damage) => !guildData.templateID.damageName.includes(damage));
	}
	const user = enmap.get(interaction.guild.id, `user.${userID}`);
	const newChar = {
		charName,
		messageId: msgId,
		damageName: damage,
		isPrivate,
	};
	//biome-ignore lint/performance/noDelete: We need to delete the key if it's not needed (because we are registering in the DB and undefined can lead to a bug)
	if (!charName) delete newChar.charName;
	//biome-ignore lint/performance/noDelete: We need to delete the key if it's not needed (because we are registering in the DB and undefined can lead to a bug)
	if (!damage) delete newChar.damageName;
	if (user) {
		const char = user.find((char) => {
			return char.charName?.subText(charName, true);
		});
		const charIndx = user.findIndex((char) => {
			return char.charName?.subText(charName, true);
		});
		if (char) {
			if (errorOnDuplicate) throw new Error("DUPLICATE");
			//delete old message
			if (deleteMsg) {
				try {
					const threadOfChar = await searchUserChannel(
						enmap,
						interaction,
						ln(interaction.locale),
						ids.channelId
					);
					if (threadOfChar) {
						const oldMessage = await threadOfChar.messages.fetch(char.messageId[1]);
						if (oldMessage) oldMessage.delete();
					}
				} catch (error) {
					//skip unknow message
				}
			}
			//overwrite the message id
			char.messageId = msgId;
			if (damage) char.damageName = damage;
			enmap.set(interaction.guild.id, char, `user.${userID}.${charIndx}`);
		} else enmap.set(interaction.guild.id, [...user, newChar], `user.${userID}`);
		return;
	}
	enmap.set(interaction.guild.id, [newChar], `user.${userID}`);
}

/**
 * Get the userData from the embed
 * @param message {Message}
 * @param ul {Translation}
 * @param first {boolean=false} Indicate it the registering of the user or an edit
 */
export function getUserByEmbed(
	message: Message,
	ul: Translation,
	first: boolean | undefined = false,
	integrateCombinaison = true,
	fetchAvatar = false,
	fetchChannel = false
) {
	const user: Partial<UserData> = {};
	const userEmbed = first ? ensureEmbed(message) : getEmbeds(ul, message, "user");
	if (!userEmbed) return;
	const parsedFields = parseEmbedFields(userEmbed.toJSON() as Embed);
	const charNameFields = [
		{ key: "common.charName", value: parsedFields?.["common.charName"] },
		{ key: "common.character", value: parsedFields?.["common.character"] },
	].find((field) => field.value !== undefined);
	if (charNameFields && charNameFields.value !== "common.noSet") {
		user.userName = charNameFields.value;
	}
	const templateStat = first
		? userEmbed.toJSON().fields
		: getEmbeds(ul, message, "stats")?.toJSON()?.fields;
	let stats: { [name: string]: number } | undefined = undefined;
	if (templateStat) {
		stats = {};
		for (const stat of templateStat) {
			if (first && !stat.name.startsWith("✏️")) continue;
			const value = Number.parseInt(stat.value.removeBacktick(), 10);
			if (Number.isNaN(value)) {
				//it's a combinaison
				//remove the `x` = text;
				const combinaison = stat.value.split("=")[1].trim();
				if (integrateCombinaison)
					stats[stat.name.unidecode()] = Number.parseInt(combinaison, 10);
			} else stats[stat.name.unidecode()] = value;
		}
	}
	user.stats = stats;
	const damageFields = first
		? userEmbed.toJSON().fields
		: getEmbeds(ul, message, "damage")?.toJSON()?.fields;
	let templateDamage: { [name: string]: string } | undefined = undefined;
	if (damageFields) {
		templateDamage = {};
		for (const damage of damageFields) {
			templateDamage[damage.name.unidecode()] = damage.value.removeBacktick();
		}
	}
	const templateEmbed = first ? userEmbed : getEmbeds(ul, message, "template");
	const templateFields = parseEmbedFields(templateEmbed?.toJSON() as Embed);
	user.damage = templateDamage;
	user.template = {
		diceType: templateFields?.["common.dice"] || undefined,
		critical: {
			success: Number.parseInt(templateFields?.["roll.critical.success"], 10),
			failure: Number.parseInt(templateFields["roll.critical.failure"], 10),
		},
	};
	if (fetchAvatar) user.avatar = userEmbed.toJSON().thumbnail?.url || undefined;
	if (fetchChannel) user.channel = message.channel.id;
	return user as UserData;
}

/**
 * Register the managerId in the database
 * @param {GuildData} guildData
 * @param {BaseInteraction} interaction
 * @param {string} channel
 */
export function setDefaultManagerId(
	guildData: Settings,
	interaction: BaseInteraction,
	channel?: string
) {
	if (!channel || !interaction.guild) return;
	guildData.set(interaction.guild.id, channel, "managerId");
}

export async function getFirstRegisteredChar(
	client: EClient,
	interaction: CommandInteraction,
	ul: Translation
) {
	const userData = client.settings.get(
		interaction.guild!.id,
		`user.${interaction.user.id}`
	);
	if (!userData) {
		await reply(interaction, {
			embeds: [embedError(ul("error.notRegistered"), ul)],
			ephemeral: true,
		});
		return;
	}
	const firstChar = userData[0];
	const optionChar = firstChar.charName?.capitalize();
	const userStatistique = await getUserFromMessage(
		client.settings,
		interaction.user.id,
		interaction,
		firstChar.charName
	);

	return { optionChar, userStatistique };
}
