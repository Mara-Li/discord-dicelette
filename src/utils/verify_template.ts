/* eslint-disable @typescript-eslint/no-unused-vars */
import { BaseInteraction, Locale } from "discord.js";
import { evaluate } from "mathjs";
import removeAccents from "remove-accents";
import { roll } from "../dice";
import { StatisticalTemplate } from "../interface";
import { ln } from "../localizations";

export function evalCombinaison(combinaison: {[name: string]: string}, stats: {[name: string]: number}) {
	const newStats: {[name: string]: number} = {};
	for (const [stat, combin] of Object.entries(combinaison)) {
		//replace the stats in formula
		let formula = combin;
		for (const [statName, value] of Object.entries(stats)) {
			const regex = new RegExp(statName, "g");
			formula = formula.replace(regex, value.toString());
		}
		try {
			const result = evaluate(formula);
			newStats[stat] = result;
		} catch (error) {
			throw new Error(`Invalid formula for ${stat}`);
		}
	}
	return newStats;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function verifyTemplateValue(template: any, interaction: BaseInteraction): StatisticalTemplate {
	const ul = ln(interaction.locale as Locale);
	const statistiqueTemplate: StatisticalTemplate = {
		statistic: {},
		diceType: "",
		comparator: {
			sign: ">",
			value: 0,
			formula: "",
		},
	};
	if (template.statistic) {
		for (const [key, value] of Object.entries(template.statistic)) {
			const dataValue = value as { max?: number, min?: number, combinaison?: string };
			const statName = removeAccents(key).toLowerCase();
			if (dataValue.max && dataValue.min && dataValue.max <= dataValue.min)
				throw new Error("Max must be greater than min");
			if (dataValue.max && dataValue.max <= 0 ) dataValue.max = undefined;
			if (dataValue.min && dataValue.min <= 0 ) dataValue.min = undefined;
			const formula = dataValue.combinaison ? removeAccents(dataValue.combinaison).toLowerCase() : undefined;
			statistiqueTemplate.statistic[statName] = {
				max: dataValue.max,
				min: dataValue.min,
				combinaison: formula || undefined,
			};
		}
	}
	if (template.diceType) {
		//verify is dice is valid using API
		try {
			roll(template.diceType);
			statistiqueTemplate.diceType = template.diceType;
		} catch (e) {
			throw new Error(ul.error.invalidDice);
		}
	}

	if (!template.comparator)
		throw new Error(ul.error.invalidComparator);
	if (template.comparator) {
		if (!template.comparator.sign.match(/(>|<|>=|<=|=|!=)/))
			throw new Error(ul.error.incorrectSign);
		if (template.comparator.value <= 0)
			template.comparator.value = undefined;
		if (template.comparator.formula){
			template.comparator.formula = removeAccents(template.comparator.formula);
		
		}

		if (template.comparator.criticalSuccess && template.comparator.criticalSuccess<=0) template.comparator.criticalSuccess = undefined;
		if (template.comparator.criticalFailure && template.comparator.criticalFailure<=0) template.comparator.criticalFailure = undefined;
		statistiqueTemplate.comparator = template.comparator;
	}
	if (template.total) {
		if (template.total <= 0)
			template.total = undefined;
		statistiqueTemplate.total = template.total;
	}
	if (template.charName) statistiqueTemplate.charName = template.charName;

	try {
		testFormula(statistiqueTemplate, interaction);
		testCombinaison(statistiqueTemplate, interaction);
	} catch (error) {
		throw new Error((error as Error).message);
	}

	return statistiqueTemplate;
}

function testCombinaison(template: StatisticalTemplate, interaction: BaseInteraction) {
	const ul = ln(interaction.locale as Locale);
	const onlyCombinaisonStats = Object.fromEntries(Object.entries(template.statistic).filter(([_, value]) => value.combinaison !== undefined));
	const allOtherStats = Object.fromEntries(Object.entries(template.statistic).filter(([_, value]) => !value.combinaison));	
	if (Object.keys(onlyCombinaisonStats).length===0) return;
	const allStats = Object.keys(template.statistic).filter(stat => !template.statistic[stat].combinaison);
	if (allStats.length === 0) 
		throw new Error(ul.error.noStat);
	const error= [];
	for (const [stat, value] of Object.entries(onlyCombinaisonStats)) {
		let formula = value.combinaison as string;
		for (const [_, data] of Object.entries(allOtherStats)) {
			const {max, min} = data;
			const total = template.total || 100;
			const randomStatValue = max && min ? Math.floor(Math.random() * (max - min + 1)) + min : Math.floor(Math.random() * total);
			const regex = new RegExp(stat, "g");
			formula = formula.replace(regex, randomStatValue.toString());
		}
		try {
			evaluate(formula);
		} catch (e) {
			error.push(stat);
		}
	}
	if (error.length > 0) 
		throw new Error(`${ul.error.invalidFormula}${ul.common.space}: ${error.join(", ")}`);
	return;
}

function testFormula(template: StatisticalTemplate, interaction: BaseInteraction) {
	const ul = ln(interaction.locale as Locale);
	const firstStatNotCombinaison = Object.keys(template.statistic).find(stat => !template.statistic[stat].combinaison);
	if (!firstStatNotCombinaison) 
		throw new Error(`${ul.error.noStat} : ${ul.error.onlyCombination}`);
	if (!template.comparator.formula) return;
	const stats = template.statistic[firstStatNotCombinaison];
	const {min, max} = stats;
	const total = template.total || 100;
	
	let randomStatValue = 0;
	while (randomStatValue < total)
		if (max && min)
			randomStatValue = Math.floor(Math.random() * (max - min + 1)) + min;
		else if (max)
			randomStatValue = Math.floor(Math.random() * (max - 1)) + 1;
		else if (min)
			randomStatValue = Math.floor(Math.random() * (total - min + 1)) + min;
		else
			randomStatValue = Math.floor(Math.random() * total);
	const formula = template.comparator.formula.replace("$", randomStatValue.toString());	
	try {
		evaluate(formula);
		return true;
	} catch (error) {
		throw new Error(ul.error.invalidFormula);
	}
}