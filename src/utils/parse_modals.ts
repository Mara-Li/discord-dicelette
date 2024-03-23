import { Locale, ModalSubmitInteraction } from "discord.js";
import removeAccents from "remove-accents";
import { StatisticalTemplate } from "src/interface";

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