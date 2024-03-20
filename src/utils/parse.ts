/* eslint-disable @typescript-eslint/no-explicit-any */
import { ButtonInteraction, Embed, EmbedBuilder, Locale, Message, ModalSubmitInteraction } from "discord.js";
import { TFunction } from "i18next";
import removeAccents from "remove-accents";

import { StatisticalTemplate, User } from "../interface";
import { ln } from "../localizations";

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

export function parseEmbed(interaction: ButtonInteraction | ModalSubmitInteraction) {
	const embed = interaction.message?.embeds[0];
	if (!embed) return;
	return parseEmbedFields(embed);
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
	if (!allEmbeds) throw new Error("[error.noEmbed]");
	for (const embed of allEmbeds) {
		const embedJSON = embed.toJSON();
		if (embed.title === ul("modals.embedTitle") && which === "user") return new EmbedBuilder(embedJSON);
		else if (embed.title === ul("modals.statsTitle") && which === "stats") return new EmbedBuilder(embedJSON);
		else if (embed.title === ul("modals.diceTitle") && which === "damage") return new EmbedBuilder(embedJSON);
		else if (embed.title === ul("modals.template.title") && which === "template") return new EmbedBuilder(embedJSON);
	}
}



export function getUserByEmbed(message: Message, ul: TFunction<"translation", undefined>) {
	const user: Partial<User> = {};
	const userEmbed = getEmbeds(ul, message, "user");
	if (!userEmbed) return;
	const parsedFields = parseEmbedFields(userEmbed.toJSON() as Embed);
	if (parsedFields[ul("common.charName")] !== ul("common.noSet")) {
		user.userName = parsedFields[ul("common.charName")];
	}
	const templateStat = getEmbeds(ul, message, "stats")?.toJSON()?.fields;
	let stats: {[name: string]: number} | undefined = undefined;
	if (templateStat) {
		stats = {};
		for (const stat of templateStat) {
			stats[stat.name.replace("✏️", "").toLowerCase().trim()] = parseInt(stat.value, 10);
		}
	}
	user.stats = stats;
	const damageFields = getEmbeds(ul, message, "damage")?.toJSON()?.fields;
	let templateDamage: {[name: string]: string} | undefined = undefined;
	if (damageFields) {
		templateDamage = {};
		for (const damage of damageFields) {
			templateDamage[damage.name.replace("🔪", "").trim().toLowerCase()] = damage.value;
		}
	}
	const templateEmbed = getEmbeds(ul, message, "template");
	if (!templateEmbed) return;
	const templateFields = parseEmbedFields(templateEmbed.toJSON() as Embed);
	user.damage = templateDamage;
	user.template = {
		diceType: templateFields?.[ul("common.dice")] || undefined,
		critical: {
			success: templateFields?.[ul("roll.critical.success")] ? parseInt(parsedFields[ul("roll.critical.success")], 10) : undefined,
			failure: templateFields?.[ul("roll.critical.failure")] ? parseInt(parsedFields[ul("roll.critical.failure")], 10) : undefined,
		}
	};
	return user as User;

}