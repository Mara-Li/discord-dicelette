/* eslint-disable @typescript-eslint/no-explicit-any */
import { createTemplateEmbed } from "@database";
import type { StatisticalTemplate } from "@dicelette/core";
import type { PersonnageIds, Settings, Translation } from "@interface";
import { findKeyFromTranslation, ln } from "@localization";
import { removeEmojiAccents, searchUserChannel } from "@utils";
import { type ButtonInteraction, type CommandInteraction, type Embed, EmbedBuilder, type Locale, type Message, type ModalSubmitInteraction } from "discord.js";

/**
 * Ensure the embeds are present
 * @param {Message} message 
 */
export function ensureEmbed(message?: Message) {
	const oldEmbeds = message?.embeds[0];
	if (!oldEmbeds || !oldEmbeds?.fields) throw new Error("[error.noEmbed]");
	return oldEmbeds;
}

/**
 * Parse the embed fields from an interaction
 * @param interaction {ButtonInteraction | ModalSubmitInteraction}
 */
export function parseEmbed(interaction: ButtonInteraction | ModalSubmitInteraction) {
	const embed = interaction.message?.embeds[0];
	if (!embed) return;
	return parseEmbedFields(embed);
}

/**
 * Create a list of embeds
 * @param userDataEmbed {EmbedBuilder}
 * @param statsEmbed {EmbedBuilder}
 * @param diceEmbed {EmbedBuilder}
 * @param templateEmbed {EmbedBuilder}
 */
export function createEmbedsList(userDataEmbed: EmbedBuilder, statsEmbed?: EmbedBuilder, diceEmbed?: EmbedBuilder, templateEmbed?: EmbedBuilder) {
	const allEmbeds = [userDataEmbed];
	if (statsEmbed) allEmbeds.push(statsEmbed);
	if (diceEmbed) allEmbeds.push(diceEmbed);
	if (templateEmbed) allEmbeds.push(templateEmbed);
	return allEmbeds;
}

/**
 * Get the embeds from the message and replace based on the embed to replace
 * Also it returns if the embeds exists or not (useful for the buttons)
 * @param ul {Translation}
 * @param embedToReplace {which:"user" | "stats" | "damage" | "template", embed: EmbedBuilder}
 */
export function getEmbedsList(ul: Translation, embedToReplace: { which: "user" | "stats" | "damage" | "template", embed: EmbedBuilder }, message?: Message) {
	const userDataEmbed = embedToReplace.which === "user" ? embedToReplace.embed : getEmbeds(ul, message, "user");
	if (!userDataEmbed) throw new Error("[error.noEmbed]");
	const statsEmbed = embedToReplace.which === "stats" ? embedToReplace.embed : getEmbeds(ul, message, "stats");
	const diceEmbed = embedToReplace.which === "damage" ? embedToReplace.embed : getEmbeds(ul, message, "damage");
	const templateEmbed = embedToReplace.which === "template" ? embedToReplace.embed : getEmbeds(ul, message, "template");
	return {
		list: createEmbedsList(userDataEmbed, statsEmbed, diceEmbed, templateEmbed),
		exists: {
			user: !!userDataEmbed,
			stats: !!statsEmbed,
			damage: !!diceEmbed,
			template: !!templateEmbed
		}
	};
}

/**
 * Remove the embeds from the list
 * @param embeds {EmbedBuilder[]}
 * @param which {"user" | "stats" | "damage" | "template"}
 * @param ul {Translation}
*/
export function removeEmbedsFromList(embeds: EmbedBuilder[], which: "user" | "stats" | "damage" | "template", ul: Translation) {
	return embeds.filter(embed => {
		if (which === "user") return embed.toJSON().title !== ul("embed.user");
		if (which === "stats") return embed.toJSON().title !== ul("embed.stats");
		if (which === "damage") return embed.toJSON().title !== ul("embed.dice");
		if (which === "template") return embed.toJSON().title !== ul("embed.template");
	});
}

/**
 * Parse the embed fields and remove the backtick if any
 * @param embed {Embed}
 * @returns { {[name: string]: string} }
 */
export function parseEmbedFields(embed: Embed): { [name: string]: string } {
	const fields = embed.fields;
	if (!fields) return {};
	const parsedFields: { [name: string]: string } = {};
	for (const field of fields) {
		parsedFields[findKeyFromTranslation(removeBacktick(field.name))] = findKeyFromTranslation(removeBacktick(field.value));
	}
	return parsedFields;
}

/**
 * Get the embeds from the message and recreate it as EmbedBuilder
 * @param message {Message}
 * @param which {"user" | "stats" | "damage" | "template"}
 */
export function getEmbeds(ul: Translation, message?: Message, which?: "user" | "stats" | "damage" | "template") {
	const allEmbeds = message?.embeds;
	if (!allEmbeds) throw new Error(ul("error.noEmbed"));
	for (const embed of allEmbeds) {
		const embedJSON = embed.toJSON();
		const titleKey = findKeyFromTranslation(embed.title ?? "");
		if (titleKey === "embed.user" && which === "user") return new EmbedBuilder(embedJSON);
		if ((titleKey === "embed.stats" || titleKey === "common.statistic") && which === "stats") return new EmbedBuilder(embedJSON);
		if (titleKey === "embed.dice" && which === "damage") return new EmbedBuilder(embedJSON);
		if (titleKey === "embed.template" && which === "template") return new EmbedBuilder(embedJSON);
		if (titleKey === "embed.add" && which === "user") return new EmbedBuilder(embedJSON);
	}
}


/**
 * Update the template of existing user when the template is edited by moderation
 * @param guildData {GuildData}
 * @param interaction {CommandInteraction}
 * @param ul {Translation}
 * @param template {StatisticalTemplate}
 */
export async function bulkEditTemplateUser(guildData: Settings, interaction: CommandInteraction, ul: Translation, template: StatisticalTemplate) {
	const users = guildData.get(interaction.guild!.id, "user");

	for (const userID in users) {
		for (const char of users[userID]) {
			const managerId: PersonnageIds = Array.isArray(char.messageId) ? { channelId: char.messageId[1], messageId: char.messageId[0] } : { messageId: char.messageId };
			const thread = await searchUserChannel(guildData, interaction, ul, char.isPrivate, managerId?.channelId);
			if (!thread) continue;
			try {
				const userMessages = await thread.messages.fetch(managerId.messageId);
				const templateEmbed = getEmbeds(ul, userMessages, "template");
				if (!templateEmbed) continue;
				const newEmbed = createTemplateEmbed(ul);
				if (template.diceType)
					newEmbed.addFields({
						name: ul("common.dice"),
						value: `\`${template.diceType}\``,
						inline: true
					});
				if (template.critical?.success)
					newEmbed.addFields({
						name: ul("roll.critical.success"),
						value: `\`${template.critical.success}\``,
						inline: true
					});
				if (template.critical?.failure)
					newEmbed.addFields({
						name: ul("roll.critical.failure"),
						value: `\`${template.critical.failure}\``,
						inline: true
					});
				const listEmbed = getEmbedsList(ul, { which: "template", embed: newEmbed }, userMessages);
				await userMessages.edit({ embeds: listEmbed.list });
			} catch {
				//pass
			}
		}
	}
}

/**
 * Get the statistiques fields from the modals and verify if all value are correct and if the total is not exceeded
 * @param interaction {ButtonInteraction}
 * @param templateData {StatisticalTemplate}
 */
export function getStatistiqueFields(interaction: ModalSubmitInteraction, templateData: StatisticalTemplate) {
	const ul = ln(interaction.locale as Locale);
	const combinaisonFields: { [name: string]: string } = {};
	const stats: { [name: string]: number } = {};
	let total = templateData.total;
	if (!templateData.statistics) return { combinaisonFields, stats };
	for (const [key, value] of Object.entries(templateData.statistics)) {
		const name = removeEmojiAccents(key);
		if (!interaction.fields.fields.has(name) && !value.combinaison) continue;
		if (value.combinaison) {
			combinaisonFields[key] = value.combinaison;
			continue;
		}
		const statValue = interaction.fields.getTextInputValue(name);
		if (!statValue) continue;
		const num = Number.parseInt(statValue, 10);
		if (value.min && num < value.min) {
			throw new Error(ul("error.mustBeGreater", { value: name, min: value.min }));
		} if (value.max && num > value.max) {
			throw new Error(ul("error.mustBeLower", { value: name, max: value.max }));
		}
		if (total) {
			total -= num;
			if (total < 0) {
				const exceeded = total * -1;
				throw new Error(ul("error.totalExceededBy", { value: name, max: exceeded }));
			}
			stats[key] = num;
		} else stats[key] = num;
	}
	return { combinaisonFields, stats };
}

/**
 * Remove backtick in value
 * Used when parsing the user embed
 * @param text {string}
 * @returns 
 */
export function removeBacktick(text: string) {
	return text.replace(/`/g, "");
}