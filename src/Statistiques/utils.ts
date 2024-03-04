/**
 * TODO:
 * - Edit the reference message
 * - Parse the different message with JSON.parse()
 * - Search user in reference message
 * - Default template
 * 
 */

import removeAccents from "remove-accents";

import { roll } from "../dice";
import { StatistiqueTemplate } from "../interface";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function verifyTemplateValue(template: any): StatistiqueTemplate {
	const statistiqueTemplate: StatistiqueTemplate = {
		statistiques: [],
		diceType: "",
		statistiqueUsage: "+",
		comparator: {
			sign: ">",
			value: 0,
		},
	};
	if (template.statistiques) {
		for (const stat of template.statistiques) {
			const value = Object.values(stat)[0] as { max?: number, min?: number };
			const key = removeAccents(Object.keys(stat)[0]) as string;
			if (value.max && value.min && value.max <= value.min)
				throw new Error("Max must be greater than min");
			if (value.max && value.max <= 0 ) stat.max = undefined;
			if (value.min && value.min <= 0 ) stat.min = undefined;
			statistiqueTemplate.statistiques.push({ [key]: {
				max: value.max,
				min: value.min,
			} });
		}
	}
	if (template.diceType) {
		//verify is dice is valid using API
		try {
			roll(template.diceType);
			statistiqueTemplate.diceType = template.diceType;
		} catch (e) {
			throw new Error("Invalid dice type");
		}
	}
	if (template.statistiqueUsage) {
		statistiqueTemplate.statistiqueUsage = template.statistiqueUsage;
	}
	if (!template.comparator)
		throw new Error("Invalid comparator: missing sign");
	if (template.comparator) {
		if (!template.comparator.sign.match(/(>|<|>=|<=|=|!=)/))
			throw new Error("Invalid comparator sign");
		if (template.comparator.value <= 0)
			template.comparator.value = undefined;
		statistiqueTemplate.comparator = template.comparator;
	}
	if (template.total) {
		if (template.total <= 0)
			template.total = undefined;
		statistiqueTemplate.total = template.total;
	}
	return statistiqueTemplate;
}