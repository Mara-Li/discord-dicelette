/* eslint-disable @typescript-eslint/no-explicit-any */
import { ButtonInteraction, CommandInteraction, Embed, EmbedBuilder, Locale, Message, ModalSubmitInteraction, TextChannel } from "discord.js";
import { TFunction } from "i18next";
import removeAccents from "remove-accents";

import { createTemplateEmbed } from "../database";
import { GuildData, StatisticalTemplate } from "../interface";
import { ln } from "../localizations";
import { title } from ".";

export function parseEmbed(interaction: ButtonInteraction | ModalSubmitInteraction) {
	const embed = interaction.message?.embeds[0];
	if (!embed) return;
	return parseEmbedFields(embed);
}

export function createEmbedsList(userDataEmbed: EmbedBuilder, statsEmbed?: EmbedBuilder, diceEmbed?: EmbedBuilder, templateEmbed?: EmbedBuilder) {
	const allEmbeds = [userDataEmbed];
	if (statsEmbed) allEmbeds.push(statsEmbed);
	if (diceEmbed) allEmbeds.push(diceEmbed);
	if (templateEmbed) allEmbeds.push(templateEmbed);
	return allEmbeds;
}

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

export function removeEmbedsFromList(embeds: EmbedBuilder[], which: "user" | "stats" | "damage" | "template", ul: TFunction<"translation", undefined>) {
	return embeds.filter(embed => {
		if (which === "user") return embed.toJSON().title !== ul("embed.user");
		else if (which === "stats") return embed.toJSON().title !== ul("embed.stats");
		else if (which === "damage") return embed.toJSON().title !== ul("embed.dice");
		else if (which === "template") return embed.toJSON().title !== ul("embed.template");
	});
}

export function parseEmbedFields(embed: Embed) {
	const fields = embed.fields;
	const parsedFields: {[name: string]: string} = {};
	for (const field of fields) {
		parsedFields[field.name] = field.value;
	}
	return parsedFields;
}

/**
 * Get the embeds from the message
 * @param message {Message}
 * @param which {0|1|2|3}
 * - 0 : userData
 * - 1 : statistics
 * - 2 : damage
 * - 3 : template
 * @returns 
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



export async function bulkEditTemplateUser(guildData: GuildData, interaction: CommandInteraction, ul: TFunction<"translation", undefined>, template: StatisticalTemplate) {
	const users = guildData.user;
	const channel = await interaction.guild?.channels.fetch(guildData.templateID.channelId);
	if (!channel || !(channel instanceof TextChannel)) return;
	const thread = (await channel.threads.fetch()).threads.find(thread => thread.name === "📝 • [STATS]");
	if (!thread) return;
	for (const userID in users) {
		for (const char of users[userID]) {
			const userMessages = await thread.messages.fetch(char.messageId);
			const templateEmbed = getEmbeds(ul, userMessages, "template");
			if (!templateEmbed) continue;
			const newEmbed = createTemplateEmbed(ul);
			if (template.diceType)
				newEmbed.addFields({
					name: ul("common.dice"),
					value: template.diceType,
					inline: true
				});
			if (template.critical?.success) 
				newEmbed.addFields({
					name: ul("roll.critical.success"),
					value: template.critical.success.toString(),
					inline: true
				});
			if (template.critical?.failure) 
				newEmbed.addFields({
					name: ul("roll.critical.failure"),
					value: template.critical.failure.toString(),
					inline: true
				});
			const listEmbed = getEmbedsList(ul, {which: "template", embed: newEmbed}, userMessages);
			await userMessages.edit({ embeds: listEmbed.list });
		}
	}
}

export function getStatistiqueFields(interaction: ModalSubmitInteraction, templateData: StatisticalTemplate) {
	const ul = ln(interaction.locale as Locale);
	const combinaisonFields: {[name: string]: string} = {};
	const stats: { [name: string]: number } = {};
	let total = templateData.total;
	if (!templateData.statistics) return { combinaisonFields, stats };
	for (const [key, value] of Object.entries(templateData.statistics)) {
		if (!interaction.fields.fields.has(key) && !value.combinaison) continue;
		const name = removeAccents(key).toLowerCase().replace("✏️", "").trim();
		if (value.combinaison) {
			combinaisonFields[name] = value.combinaison;
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
			} else stats[name] = num;
		} else stats[name] = num;
	}
	return { combinaisonFields, stats };
}