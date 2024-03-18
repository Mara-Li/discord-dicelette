/* eslint-disable @typescript-eslint/no-explicit-any */
import { ButtonInteraction, Embed, Locale, ModalSubmitInteraction } from "discord.js";
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

export function getUserByEmbed(embed: Embed, ul: TFunction<"translation", undefined>) {
	const fields = embed.fields;
	if (!fields) return;
	const user: Partial<User> = {};
	const parsedFields = parseEmbedFields(embed);
	if (parsedFields[ul("common.charName")] !== ul("common.noSet")) {
		user.userName = parsedFields[ul("common.charName")];
	}
	const templateStat = embed.fields.filter(field => field.name.startsWith("✏️"));
	let stats: {[name: string]: number} | undefined = undefined;
	if (templateStat.length > 0) {
		stats = {};
		for (const stat of templateStat) {
			stats[stat.name.replace("✏️", "").toLowerCase().trim()] = parseInt(stat.value, 10);
		}
	}
	user.stats = stats;
	const damageFields = embed.fields.filter(field => field.name.startsWith("🔪"));
	let templateDamage: {[name: string]: string} | undefined = undefined;
	if (damageFields.length > 0) {
		templateDamage = {};
		for (const damage of damageFields) {
			templateDamage[damage.name.replace("🔪", "").trim().toLowerCase()] = damage.value;
		}
	}
	user.damage = templateDamage;
	user.template = {
		diceType: parsedFields?.[ul("common.dice")] || undefined,
		critical: {
			success: parsedFields?.[ul("roll.critical.success")] ? parseInt(parsedFields[ul("roll.critical.success")], 10) : undefined,
			failure: parsedFields?.[ul("roll.critical.failure")] ? parseInt(parsedFields[ul("roll.critical.failure")], 10) : undefined,
		}
	};
	return user as User;

}