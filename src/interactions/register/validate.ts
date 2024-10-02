import { warn } from "@console";
import type { StatisticalTemplate } from "@dicelette/core";
import {
	createDiceEmbed,
	createStatsEmbed,
	createTemplateEmbed,
	createUserEmbed,
} from "@interactions";
import type { Settings, Translation, UserData } from "@interface";
import { ln } from "@localization";
import {
	NoChannel,
	NoEmbed,
	addAutoRole,
	embedError,
	reply,
	repostInThread,
} from "@utils";
import { continueCancelButtons, registerDmgButton } from "@utils/buttons";
import { isUserNameOrId } from "@utils/find";
import { createEmbedsList, getEmbeds, parseEmbedFields } from "@utils/parse";
import * as Djs from "discord.js";
export function verifyAvatarUrl(url: string) {
	if (url.length === 0) return false;
	if (url.match(/^(https:)([/|.|\w|\s|-])*\.(?:jpe?g|gifv?|png|webp)$/gi)) return url;
	return false;
}

/**
 * Create the embed after registering the user
 * If the template has statistics, show the continue button
 * Else show the dice button
 * @param interaction {ModalSubmitInteraction}
 * @param template {StatisticalTemplate}
 */
export async function createEmbedFirstPage(
	interaction: Djs.ModalSubmitInteraction,
	template: StatisticalTemplate,
	setting: Settings
) {
	const lang = setting.get(interaction.guild!.id, "lang") ?? interaction.locale;
	const ul = ln(lang);
	const channel = interaction.channel;
	if (!channel) {
		throw new NoChannel();
	}
	const userFromField = interaction.fields.getTextInputValue("userID");
	const user = await isUserNameOrId(userFromField, interaction);
	if (!user) {
		reply(interaction, { embeds: [embedError(ul("error.user"), ul)], ephemeral: true });
		return;
	}
	const customChannel = interaction.fields.getTextInputValue("channelId");
	const charName = interaction.fields.getTextInputValue("charName");
	const isPrivate =
		interaction.fields.getTextInputValue("private")?.toLowerCase() === "x";
	const avatar = interaction.fields.getTextInputValue("avatar");

	let sheetId = setting.get(interaction.guild!.id, "managerId");
	const privateChannel = setting.get(interaction.guild!.id, "privateChannel");
	if (isPrivate && privateChannel) sheetId = privateChannel;
	if (customChannel.length > 0) sheetId = customChannel;

	const verifiedAvatar = verifyAvatarUrl(avatar);
	const existChannel = sheetId
		? await interaction.guild?.channels.fetch(sheetId)
		: undefined;
	if (!existChannel) {
		reply(interaction, {
			embeds: [embedError(ul("error.noThread"), ul)],
			ephemeral: true,
		});
		return;
	}
	const embed = new Djs.EmbedBuilder()
		.setTitle(ul("embed.add"))
		.setThumbnail(verifiedAvatar ? avatar : user.displayAvatarURL())
		.setFooter({ text: ul("common.page", { nb: 1 }) })
		.addFields(
			{
				name: ul("common.charName"),
				value: charName.length > 0 ? charName : ul("common.noSet"),
				inline: true,
			},
			{ name: ul("common.user"), value: Djs.userMention(user.id), inline: true },
			{ name: ul("common.isPrivate"), value: isPrivate ? "✓" : "✕", inline: true }
		);
	if (sheetId) {
		embed.addFields({ name: "_ _", value: "_ _", inline: true });
		embed.addFields({
			name: ul("common.channel").capitalize(),
			value: `${Djs.channelMention(sheetId as string)}`,
			inline: true,
		});
		embed.addFields({ name: "_ _", value: "_ _", inline: true });
	}

	//add continue button
	if (template.statistics) {
		await reply(interaction, {
			content: verifiedAvatar
				? ""
				: `:warning: **${ul("error.avatar.url")}** *${ul("edit_avatar.default")}*`,
			embeds: [embed],
			components: [continueCancelButtons(ul)],
		});
		return;
	}
	const allButtons = registerDmgButton(ul);
	await reply(interaction, { embeds: [embed], components: [allButtons] });
}

/**
 * Validate the user and create the embeds
 * It will register the final embeds and send it in the thread
 * @param {ButtonInteraction} interaction
 * @param template {StatisticalTemplate}
 */
export async function validateUser(
	interaction: Djs.ButtonInteraction,
	template: StatisticalTemplate,
	db: Settings
) {
	const lang = db.get(interaction.guild!.id, "lang") ?? interaction.locale;
	const ul = ln(lang);
	const userEmbed = getEmbeds(ul, interaction.message, "user");
	if (!userEmbed) throw new NoEmbed();
	const oldEmbedsFields = parseEmbedFields(userEmbed.toJSON() as Djs.Embed);
	let userID = oldEmbedsFields?.["common.user"];
	let charName: string | undefined = oldEmbedsFields?.["common.charName"];
	const isPrivate = oldEmbedsFields["common.isPrivate"] === "common.yes";
	const channelToPost = oldEmbedsFields?.["common.channel"];
	if (channelToPost) {
		const channel = await interaction.guild?.channels.fetch(
			channelToPost.replace("<#", "").replace(">", "")
		);
		if (!channel) {
			await reply(interaction, {
				embeds: [embedError(ul("error.channel", { channel: channelToPost }), ul)],
				ephemeral: true,
			});
			return;
		}
	}
	if (charName && charName === "common.noSet") charName = undefined;
	if (!userID) {
		await reply(interaction, {
			embeds: [embedError(ul("error.user"), ul)],
			ephemeral: true,
		});
		return;
	}
	userID = userID.replace("<@", "").replace(">", "");
	const userDataEmbed = createUserEmbed(
		ul,
		userEmbed.toJSON().thumbnail?.url || "",
		userID,
		charName
	);
	const oldDiceEmbeds = getEmbeds(ul, interaction.message, "damage");
	const oldStatsEmbed = getEmbeds(ul, interaction.message, "stats");
	const oldDiceEmbedsFields = oldDiceEmbeds ? (oldDiceEmbeds.toJSON().fields ?? []) : [];
	const statEmbedsFields = oldStatsEmbed ? (oldStatsEmbed.toJSON().fields ?? []) : [];
	let diceEmbed: Djs.EmbedBuilder | undefined = undefined;
	let statsEmbed: Djs.EmbedBuilder | undefined = undefined;
	for (const field of oldDiceEmbedsFields) {
		if (!diceEmbed) {
			diceEmbed = createDiceEmbed(ul);
		}
		diceEmbed.addFields({
			name: field.name.unidecode(true).capitalize(),
			value: `\`${field.value}\``,
			inline: true,
		});
	}
	for (const field of statEmbedsFields) {
		if (!statsEmbed) {
			statsEmbed = createStatsEmbed(ul);
		}
		statsEmbed.addFields({
			name: field.name.unidecode(true).capitalize(),
			value: field.value,
			inline: true,
		});
	}

	const templateStat = template.statistics ? Object.keys(template.statistics) : [];
	const parsedStats = statsEmbed
		? parseEmbedFields(statsEmbed.toJSON() as Djs.Embed)
		: undefined;
	const stats: { [name: string]: number } = {};
	if (parsedStats)
		for (const stat of templateStat) {
			stats[stat] = Number.parseInt(parsedStats[stat.unidecode()], 10);
		}

	const damageFields = diceEmbed?.toJSON().fields ?? [];
	let templateDamage: { [name: string]: string } | undefined = undefined;

	if (damageFields.length > 0) {
		templateDamage = {};

		for (const damage of damageFields) {
			templateDamage[damage.name.unidecode()] = damage.value;
		}
	}
	for (const [name, dice] of Object.entries(template.damage ?? {})) {
		if (!templateDamage) templateDamage = {};
		templateDamage[name] = dice;
		if (!diceEmbed) {
			diceEmbed = createDiceEmbed(ul);
		}
		//why i forgot this????
		diceEmbed.addFields({
			name: `${name}`,
			value: `\`${dice}\``,
			inline: true,
		});
	}
	const userStatistique: UserData = {
		userName: charName,
		stats,
		template: {
			diceType: template.diceType,
			critical: template.critical,
		},
		damage: templateDamage,
		private: isPrivate,
		avatar: userEmbed.toJSON().thumbnail?.url,
	};
	let templateEmbed: Djs.EmbedBuilder | undefined = undefined;
	if (template.diceType || template.critical) {
		templateEmbed = createTemplateEmbed(ul);
		if (template.diceType)
			templateEmbed.addFields({
				name: ul("common.dice").capitalize(),
				value: `\`${template.diceType}\``,
				inline: true,
			});
		if (template.critical?.success) {
			templateEmbed.addFields({
				name: ul("roll.critical.success"),
				value: `\`${template.critical.success}\``,
				inline: true,
			});
		}
		if (template.critical?.failure) {
			templateEmbed.addFields({
				name: ul("roll.critical.failure"),
				value: `\`${template.critical.failure}\``,
				inline: true,
			});
		}
	}
	const allEmbeds = createEmbedsList(userDataEmbed, statsEmbed, diceEmbed, templateEmbed);
	await repostInThread(
		allEmbeds,
		interaction,
		userStatistique,
		userID,
		ul,
		{ stats: !!statsEmbed, dice: !!diceEmbed, template: !!templateEmbed },
		db,
		channelToPost.replace("<#", "").replace(">", "")
	);
	try {
		await interaction.message.delete();
	} catch (e) {
		warn(e, "validateUser: can't delete the message");
	}
	await addAutoRole(interaction, userID, !!statsEmbed, !!diceEmbed, db);
	await reply(interaction, { content: ul("modals.finished"), ephemeral: true });
	return;
}

/**
 * Validate the user and create the embeds when the button is clicked
 * @param interaction {ButtonInteraction}
 * @param interactionUser {User}
 */

export async function validateUserButton(
	interaction: Djs.ButtonInteraction,
	interactionUser: Djs.User,
	template: StatisticalTemplate,
	ul: Translation,
	db: Settings
) {
	const isModerator = interaction.guild?.members.cache
		.get(interactionUser.id)
		?.permissions.has(Djs.PermissionsBitField.Flags.ManageRoles);
	if (isModerator) await validateUser(interaction, template, db);
	else await reply(interaction, { content: ul("modals.noPermission"), ephemeral: true });
}
