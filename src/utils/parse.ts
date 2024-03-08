import { ButtonInteraction, Locale, ModalSubmitInteraction } from "discord.js";
import removeAccents from "remove-accents";

import { StatisticalTemplate } from "../interface";
import { ln } from "../localizations";

export function getStatistiqueFields(interaction: ModalSubmitInteraction, templateData: StatisticalTemplate) {
	const ul = ln(interaction.locale as Locale);
	const combinaisonFields: {[name: string]: string} = {};
	const stats: { [name: string]: number } = {};
	let total = templateData.total;
	for (const [key, value] of Object.entries(templateData.statistics)) {
		const name = removeAccents(key).toLowerCase();
		if (value.combinaison) {
			combinaisonFields[name] = value.combinaison;
			continue;
		}
		const statValue = interaction.fields.getTextInputValue(name);
		if (!statValue) continue;
		const num = parseInt(statValue);
		if (value.min && num < value.min) {
			throw new Error(ul.error.mustBeGreater(name, value.min));
		} else if (value.max && num > value.max) {
			throw new Error(ul.error.mustBeLower(name, value.max));
		}
		if (total) {
			total -= num;
			if (total < 0) {
				const exceeded = total * -1;
				throw new Error(ul.error.totalExceededBy(name, exceeded));
			} else stats[name] = num;
		} else stats[name] = num;
	}
	return { combinaisonFields, stats };
}

export function parseEmbed(interaction: ButtonInteraction | ModalSubmitInteraction) {
	const embed = interaction.message?.embeds[0];
	if (!embed) return;
	const fields = embed.fields;
	const parsedFields: {[name: string]: string} = {};
	for (const field of fields) {
		parsedFields[field.name] = field.value;
	}
	return parsedFields;
}