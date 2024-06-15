/* eslint-disable @typescript-eslint/no-unused-vars */
import { createDiceEmbed, createStatsEmbed, createUserEmbed } from "@database";
import type { StatisticalTemplate } from "@dicelette/core";
import type { Settings, Translation, UserData } from "@interface";
import { findKeyFromTranslation, ln } from "@localization";
import { addAutoRole, removeEmoji, removeEmojiAccents, reply, repostInThread, title } from "@utils";
import { continueCancelButtons, registerDmgButton } from "@utils/buttons";
import { createEmbedsList, ensureEmbed, parseEmbedFields } from "@utils/parse";
import { type ButtonInteraction, channelMention, EmbedBuilder, type Locale, type ModalSubmitInteraction, PermissionsBitField, type User, userMention } from "discord.js";

/**
 * Create the embed after registering the user
 * If the template has statistics, show the continue button
 * Else show the dice button
 * @param interaction {ModalSubmitInteraction}
 * @param template {StatisticalTemplate}
 */
export async function createEmbedFirstPage(interaction: ModalSubmitInteraction, template: StatisticalTemplate, setting: Settings) {
	const ul = ln(interaction.locale as Locale);
	const channel = interaction.channel;
	if (!channel) {
		throw new Error("No channel found");
	}
	const userFromField = interaction.fields.getTextInputValue("userID");
	const user = (await interaction!.guild!.members.fetch({ query: userFromField })).first();
	if (!user) {
		reply(interaction, { content: ul("error.user"), ephemeral: true });
		return;
	}
	const customChannel = interaction.fields.getTextInputValue("channelId")
	if (customChannel.length > 0) {
		const channel = await interaction.guild?.channels.fetch(customChannel);
		if (!channel) {
			reply(interaction, { content: ul("error.channel", { channel }), ephemeral: true });
			return;
		}
	}
	const charName = interaction.fields.getTextInputValue("charName");
	const isPrivate = interaction.fields.getTextInputValue("private")?.toLowerCase() === "x";
	const avatar = interaction.fields.getTextInputValue("avatar");
	let mention = setting.get(interaction.guild!.id, "managerId");
	if (isPrivate && setting.get(interaction.guild!.id, "privateChannel")) mention = setting.get(interaction.guild!.id, "privateChannel");
	else if (customChannel.length > 0) mention = customChannel;
	const embed = new EmbedBuilder()
		.setTitle(ul("embed.add"))
		.setThumbnail(avatar.length > 0 ? avatar : user.displayAvatarURL())
		.setFooter({ text: ul("common.page", { nb: 1 }) })
		.addFields(
			{ name: ul("common.charName"), value: charName.length > 0 ? charName : ul("common.noSet"), inline: true },
			{ name: ul("common.user"), value: userMention(user.id), inline: true },
			{ name: ul("common.isPrivate"), value: isPrivate ? "✓" : "✕", inline: true },
		);
	if (channelMention) {
		embed.addFields({ name: "_ _", value: "_ _", inline: true })
		embed.addFields({ name: title(ul("common.channel")), value: `${channelMention(mention as string)}`, inline: true })
		embed.addFields({ name: "_ _", value: "_ _", inline: true })
	};

	//add continue button
	if (template.statistics) {
		await reply(interaction, { embeds: [embed], components: [continueCancelButtons(ul)] });
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
export async function validateUser(interaction: ButtonInteraction, template: StatisticalTemplate, db: Settings) {
	const ul = ln(interaction.locale as Locale);
	const oldEmbeds = ensureEmbed(interaction.message);
	const oldEmbedsFields = parseEmbedFields(oldEmbeds);
	let userID = oldEmbedsFields?.["common.user"];
	let charName: string | undefined = oldEmbedsFields?.["common.charName"];
	const isPrivate = oldEmbedsFields["common.isPrivate"] === "common.yes";
	if (charName && charName === "common.noSet")
		charName = undefined;
	if (!userID) {
		await reply(interaction, { content: ul("error.user"), ephemeral: true });
		return;
	}
	userID = userID.replace("<@", "").replace(">", "");
	const userDataEmbed = createUserEmbed(ul, oldEmbeds.thumbnail?.url || "");
	let diceEmbed: EmbedBuilder | undefined = undefined;
	let statsEmbed: EmbedBuilder | undefined = undefined;
	for (const field of oldEmbeds.fields) {
		if (field.name.startsWith("🔪")) {
			if (!diceEmbed) {
				diceEmbed = createDiceEmbed(ul);
			}
			diceEmbed.addFields({
				name: title(removeEmojiAccents(field.name)),
				value: `\`${field.value}\``,
				inline: true,

			});
		} else if (field.name.startsWith("✏️")) {
			if (!statsEmbed) {
				statsEmbed = createStatsEmbed(ul);
			}
			statsEmbed.addFields({
				name: title(removeEmoji(field.name)),
				value: field.value,
				inline: true,

			});
		} else if (findKeyFromTranslation(field.name) !== "common.isPrivate") userDataEmbed.addFields({ name: field.name, value: title(field.value), inline: field.inline });
	}
	const templateStat = template.statistics ? Object.keys(template.statistics) : [];
	const stats: { [name: string]: number } = {};
	for (const stat of templateStat) {
		stats[stat] = Number.parseInt(oldEmbedsFields[removeEmojiAccents(stat)], 10);
	}
	const damageFields = oldEmbeds.fields.filter(field => field.name.startsWith("🔪"));
	let templateDamage: { [name: string]: string } | undefined = undefined;

	if (damageFields.length > 0) {
		templateDamage = {};

		for (const damage of damageFields) {
			templateDamage[removeEmojiAccents(damage.name)] = damage.value;
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
		avatar: oldEmbeds.thumbnail?.url,
	};
	let templateEmbed: EmbedBuilder | undefined = undefined;
	if (template.diceType || template.critical) {
		templateEmbed = new EmbedBuilder()
			.setTitle(ul("embed.template"))
			.setColor("DarkerGrey");
		if (template.diceType)
			templateEmbed.addFields({
				name: title(ul("common.dice")),
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
	await repostInThread(allEmbeds, interaction, userStatistique, userID, ul, { stats: !!statsEmbed, dice: !!diceEmbed, template: !!templateEmbed }, db);
	await interaction.message.delete();
	await addAutoRole(interaction, userID, !!statsEmbed, !!diceEmbed, db);
	await reply(interaction, { content: ul("modals.finished"), ephemeral: true });
	return;
}

/**
 * Validate the user and create the embeds when the button is clicked
 * @param interaction {ButtonInteraction}
 * @param interactionUser {User}
 */

export async function validateUserButton(interaction: ButtonInteraction, interactionUser: User, template: StatisticalTemplate, ul: Translation, db: Settings) {
	const isModerator = interaction.guild?.members.cache.get(interactionUser.id)?.permissions.has(PermissionsBitField.Flags.ManageRoles);
	if (isModerator)
		await validateUser(interaction, template, db);
	else
		await reply(interaction, { content: ul("modals.noPermission"), ephemeral: true });
}

