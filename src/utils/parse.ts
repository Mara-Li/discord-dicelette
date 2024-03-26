/* eslint-disable @typescript-eslint/no-explicit-any */
import { ButtonInteraction, CommandInteraction, Embed, EmbedBuilder, Locale, Message, ModalSubmitInteraction } from "discord.js";
import { TFunction } from "i18next";

import { createTemplateEmbed } from "../database";
import { GuildData, StatisticalTemplate } from "../interface";
import { ln } from "../localizations";
import { removeEmojiAccents, searchUserChannel, title } from ".";

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
 * @param ul {TFunction<"translation", undefined>}
 * @param embedToReplace {which:"user" | "stats" | "damage" | "template", embed: EmbedBuilder}
 */
export function getEmbedsList(ul: TFunction<"translation", undefined>, embedToReplace: {which:"user" | "stats" | "damage" | "template", embed: EmbedBuilder}, message?: Message) {
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
 * @param ul {TFunction<"translation", undefined>}
*/
export function removeEmbedsFromList(embeds: EmbedBuilder[], which: "user" | "stats" | "damage" | "template", ul: TFunction<"translation", undefined>) {
	return embeds.filter(embed => {
		if (which === "user") return embed.toJSON().title !== ul("embed.user");
		else if (which === "stats") return embed.toJSON().title !== ul("embed.stats");
		else if (which === "damage") return embed.toJSON().title !== ul("embed.dice");
		else if (which === "template") return embed.toJSON().title !== ul("embed.template");
	});
}

/**
 * Parse the embed fields and remove the backtick if any
 * @param embed {Embed}
 * @returns { [name: string]: string }
 */
export function parseEmbedFields(embed: Embed): {[name: string]: string} {
	const fields = embed.fields;
	const parsedFields: {[name: string]: string} = {};
	for (const field of fields) {
		parsedFields[removeBacktick(field.name)] = removeBacktick(field.value);
	}
	return parsedFields;
}

/**
 * Get the embeds from the message and recreate it as EmbedBuilder
 * @param message {Message}
 * @param which {"user" | "stats" | "damage" | "template"}
 */
export function getEmbeds(ul: TFunction<"translation", undefined>, message?: Message, which?: "user" | "stats" | "damage" | "template") {
	const allEmbeds = message?.embeds;
	if (!allEmbeds) throw new Error(ul("error.noEmbed"));
	for (const embed of allEmbeds) {
		const embedJSON = embed.toJSON();
		if (embed.title === ul("embed.user") && which === "user") return new EmbedBuilder(embedJSON);
		else if ((embed.title === ul("embed.stats") || title(embed.title ?? undefined) === title(ul("common.statistic"))) && which === "stats") return new EmbedBuilder(embedJSON);
		else if (embed.title === ul("embed.dice") && which === "damage") return new EmbedBuilder(embedJSON);
		else if (embed.title === ul("embed.template") && which === "template") return new EmbedBuilder(embedJSON);
	}
}


/**
 * Update the template of existing user when the template is edited by moderation
 * @param guildData {GuildData}
 * @param interaction {CommandInteraction}
 * @param ul {TFunction<"translation", undefined>}
 * @param template {StatisticalTemplate}
 */
export async function bulkEditTemplateUser(guildData: GuildData, interaction: CommandInteraction, ul: TFunction<"translation", undefined>, template: StatisticalTemplate) {
	const users = guildData.user;
	const thread = await searchUserChannel(guildData, interaction, ul);
	if (!thread) return;
	for (const userID in users) {
		for (const char of users[userID]) {
			try {
				const userMessages = await thread.messages.fetch(char.messageId);
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
				const listEmbed = getEmbedsList(ul, {which: "template", embed: newEmbed}, userMessages);
				await userMessages.edit({ embeds: listEmbed.list });
			} catch (error) {
				continue;
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
	const combinaisonFields: {[name: string]: string} = {};
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
		const num = parseInt(statValue, 10);
		if (value.min && num < value.min) {
			throw new Error(ul("error.mustBeGreater", {value: name, min: value.min}));
		} else if (value.max && num > value.max) {
			throw new Error(ul("error.mustBeLower", {value: name, max: value.max}));
		}
		if (total) {
			total -= num;
			if (total < 0) {
				const exceeded = total * -1;
				throw new Error(ul("error.totalExceededBy", {value: name, max: exceeded}));
			} else stats[key] = num;
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