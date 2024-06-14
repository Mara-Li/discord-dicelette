import { type StatisticalTemplate, verifyTemplateValue } from "@dicelette/core";
import type { Settings, Translation, UserData } from "@interface";
import { ln } from "@localization";
import type { EClient } from "@main";
import {haveAccess, removeEmojiAccents, reply, searchUserChannel, title } from "@utils";
import { ensureEmbed,getEmbeds, parseEmbedFields, removeBacktick } from "@utils/parse";
import { type AnyThreadChannel, type BaseInteraction, type ButtonInteraction, CategoryChannel, type CommandInteraction, type CommandInteractionOptionResolver, type Embed, type Locale, type Message, type ModalSubmitInteraction, type NewsChannel, type TextChannel } from "discord.js";
import removeAccents from "remove-accents";


/**
 * Get the guild template when clicking on the "registering user" button or when submiting
 * @param interaction {ButtonInteraction}
 */
export async function getTemplate(interaction: ButtonInteraction | ModalSubmitInteraction): Promise<StatisticalTemplate|undefined> {
	const template = interaction.message?.attachments.first();
	if (!template) return;
	const res = await fetch(template.url).then(res => res.json());
	return verifyTemplateValue(res);
}

export async function getDatabaseChar(interaction: CommandInteraction, client: EClient, t: Translation) {
	const options = interaction.options as CommandInteractionOptionResolver;
	const guildData = client.settings.get(interaction.guildId as string);
	const ul = ln(interaction.locale as Locale);
	if (!guildData) {
		await reply(interaction, ul("error.noTemplate"));
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
				if (char.charName && charName) return removeAccents(char.charName).toLowerCase() === removeAccents(charName).toLowerCase();
				return (charName == undefined && char.charName == undefined);
			});
			if (userChar) {
				return {
					[user as string]: userChar
				};
			}
		}
	}
	const userData = client.settings.get(interaction.guild!.id, `user.${user?.id ?? interaction.user.id}`);
	let findChara = userData?.find((char) => {
		if (char.charName && charName) return removeAccents(char.charName).toLowerCase() === removeAccents(charName).toLowerCase();
		return (charName == undefined && char.charName == undefined);
	});
	if (!findChara)
		findChara = userData?.[0];
	if (!findChara) {
		return undefined;
	}
	return {
		[(user?.id ?? interaction.user.id)]: findChara
	};
}



/**
 * Get the statistical Template using the database templateID information
 * @param interaction {ButtonInteraction | ModalSubmitInteraction}
 */
export async function getTemplateWithDB(interaction: ButtonInteraction | ModalSubmitInteraction | CommandInteraction, enmap: Settings) {
	if (!interaction.guild) return;
	const guild = interaction.guild;
	const templateID = enmap.get(interaction.guild.id, "templateID");
	const ul = ln(interaction.locale);
	if (!enmap.has(interaction.guild.id)||!templateID) throw new Error(ul("error.noGuildData", {server : interaction.guild.name}));

	const {channelId, messageId} = templateID;
	const channel = await guild.channels.fetch(channelId);
	if (!channel || (channel instanceof CategoryChannel)) return;
	try {
		const message = await channel.messages.fetch(messageId);
		const template = message.attachments.first();
		if (!template) throw new Error(ul("error.noTemplate"));
		const res = await fetch(template.url).then(res => res.json());
		return verifyTemplateValue(res);
	} catch (error) {
		if ((error as Error).message === "Unknown Message") throw new Error(ul("error.noTemplateId", {channelId, messageId}));
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
		integrateCombinaison?: boolean,
		allowAccess?: boolean,
		skipNotFound?: boolean
	}
) {
	if (!options) options = {integrateCombinaison: true, allowAccess: true, skipNotFound: false};
	const {integrateCombinaison, allowAccess, skipNotFound} = options;
	const ul = ln(interaction.locale);
	const serizalizedCharName = charName ? removeAccents(charName).toLowerCase() : undefined;
	const guild = interaction.guild;
	const user = guildData.get(guild!.id, `user.${userId}`)?.find(char => {
		if (char.charName && char) return removeAccents(char.charName).toLowerCase() === serizalizedCharName;
		return (charName == undefined && char.charName == undefined);
	});
	if (!user) return;
	const userMessageId = user.messageId;
	
	const thread = await searchUserChannel(guildData, interaction, ul, user.isPrivate);
	if (user.isPrivate && !allowAccess && !haveAccess(interaction, thread, userId)) {
		throw new Error(ul("error.private"));
	} else if (!thread) 
		throw new Error(ul("error.noThread"));
	try {
		const message = await thread.messages.fetch(userMessageId);
		return getUserByEmbed(message, ul, undefined, integrateCombinaison);
	} catch (error) {
		//remove the user with faulty messageId from the database
		const dbUser = guildData.get(guild!.id, `user.${userId}`);
		if (!dbUser) return;
		const index = dbUser.findIndex(char => char.messageId === userMessageId);
		if (index === -1) return;
		dbUser.splice(index, 1);
		guildData.set(guild!.id, dbUser, `user.${userId}`);
		if (!skipNotFound) throw new Error(ul("error.user"));
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
	userData: {
		userID: string,
		isPrivate?: boolean,
		charName?: string,
		damage?: string[],
		msgId: string,
	},
	interaction: BaseInteraction, 
	thread: AnyThreadChannel | TextChannel | NewsChannel, 
	enmap: Settings, 
	deleteMsg = true,
) {
	const {userID, charName, msgId, isPrivate} = userData;
	let {damage} = userData;
	if (!interaction.guild) return;
	const guildData = enmap.get(interaction.guild.id);
	const uniCharName: string | undefined = charName ? removeAccents(charName.toLowerCase()) : undefined;
	if (!guildData) return;
	if (!guildData.user) guildData.user = {};
	if (damage && guildData.templateID.damageName && guildData.templateID.damageName.length > 0) {
		//filter the damage list and remove the guildData.templateID.damageName
		damage = damage.filter(damage => !guildData.templateID.damageName.includes(damage));
	}
	const user = enmap.get(interaction.guild.id, `user.${userID}`);
	const newChar = {
		charName,
		messageId: msgId,
		damageName: damage,
		isPrivate
	};
	if (!charName) delete newChar.charName;
	if (!damage) delete newChar.damageName;
	if (user) {
		const char = user.find(char => {
			if (charName && char.charName) return removeAccents(char.charName).toLowerCase() === uniCharName;
			return (char.charName == undefined && charName == undefined);
		});
		const charIndx = user.findIndex(char => {
			if (charName && char.charName) return removeAccents(char.charName).toLowerCase() === uniCharName;
			return (char.charName == undefined && charName == undefined);
		});
		if (char){
			//delete old message
			if (deleteMsg) 
			{
				try {
					const oldMessage = await thread.messages.fetch(char.messageId);
					if (oldMessage) oldMessage.delete();
				} catch (error) {
					//skip unknow message
				}
			}
			//overwrite the message id
			char.messageId = msgId;
			if (damage) char.damageName = damage;
			enmap.set(interaction.guild.id, char, `user.${userID}.${charIndx}`);
		}
		else {
			enmap.set(interaction.guild.id, [...user, newChar], `user.${userID}`);
		}
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
export function getUserByEmbed(message: Message, ul: Translation, first = false, integrateCombinaison = true) {
	const user: Partial<UserData> = {};
	const userEmbed = first ? ensureEmbed(message) : getEmbeds(ul, message, "user");
	if (!userEmbed) return;
	const parsedFields = parseEmbedFields(userEmbed.toJSON() as Embed);
	if (parsedFields[ul("common.charName")] !== ul("common.noSet")) {
		user.userName = parsedFields[ul("common.charName")];
	}
	const templateStat = first ? userEmbed.toJSON().fields : getEmbeds(ul, message, "stats")?.toJSON()?.fields;
	let stats: {[name: string]: number} | undefined = undefined;
	if (templateStat) {
		stats = {};
		for (const stat of templateStat) {
			const value = Number.parseInt(removeBacktick(stat.value), 10);
			if (isNaN(value)) {
				//it's a combinaison 
				//remove the `x` = text;
				const combinaison = stat.value.split("=")[1].trim();
				if (integrateCombinaison)
					stats[removeEmojiAccents(stat.name)] = Number.parseInt(combinaison, 10);
			}
			else stats[removeEmojiAccents(stat.name)] = value;
		}
	}
	user.stats = stats;
	const damageFields = first ? userEmbed.toJSON().fields : getEmbeds(ul, message, "damage")?.toJSON()?.fields;
	let templateDamage: {[name: string]: string} | undefined = undefined;
	if (damageFields) {
		templateDamage = {};
		for (const damage of damageFields) {
			templateDamage[removeEmojiAccents(damage.name)] = removeBacktick(damage.value);
		}
	}
	const templateEmbed = first ? userEmbed : getEmbeds(ul, message, "template");
	const templateFields = parseEmbedFields(templateEmbed?.toJSON() as Embed);
	user.damage = templateDamage;
	user.template = {
		diceType: templateFields?.[title(ul("common.dice"))] || templateFields?.[(ul("common.dice"))] || undefined,
		critical: {
			success: Number.parseInt(templateFields?.[ul("roll.critical.success")], 10),
			failure: Number.parseInt(templateFields[ul("roll.critical.failure")], 10),
		}
	};
	return user as UserData;

}

/**
 * Register the managerId in the database
 * @param {GuildData} guildData 
 * @param {BaseInteraction} interaction 
 * @param {string} channel 
 */
export function registerManagerID(guildData: Settings, interaction: BaseInteraction, channel?: string) {
	if (!channel || !interaction.guild) return;
	guildData.set(interaction.guild.id, channel, "managerId");
}

export async function getFirstRegisteredChar(client: EClient, interaction: CommandInteraction, ul: Translation) {
	const userData = client.settings.get(interaction.guild!.id, `user.${interaction.user.id}`);
	if (!userData) {
		await reply(interaction,{ content: ul("error.notRegistered"), ephemeral: true });
		return;
	}
	const firstChar = userData[0];
	const optionChar = title(firstChar.charName);
	const userStatistique = await getUserFromMessage(client.settings, interaction.user.id, interaction, firstChar.charName);

	return {optionChar, userStatistique};
}