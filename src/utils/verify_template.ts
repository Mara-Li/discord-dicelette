/* eslint-disable @typescript-eslint/no-unused-vars */
import { evaluate } from "mathjs";
import removeAccents from "remove-accents";

import { roll } from "../dice";
import { StatisticalTemplate } from "../interface";

export function evalCombinaison(combinaison: {[name: string]: string}, stats: {[name: string]: number}) {
	const newStats: {[name: string]: number} = {};
	for (const [stat, combin] of Object.entries(combinaison)) {
		//replace the stats in formula
		let formula = combin;
		for (const [statName, value] of Object.entries(stats)) {
			const regex = new RegExp(statName, "gi");
			formula = formula.replace(regex, value.toString());
		}
		try {
			const result = evaluate(formula);
			newStats[stat] = result;
		} catch (error) {
			throw new Error(`[error.invalidFormula, common.space]: ${stat}`);
		}
	}
	return newStats;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function verifyTemplateValue(template: any): StatisticalTemplate {
	const statistiqueTemplate: StatisticalTemplate = {
		statistics: {},
		diceType: "",
		comparator: {
			sign: ">",
			value: 0,
			formula: "",
		},
	};
	if (template.statistics) {
		for (const [key, value] of Object.entries(template.statistics)) {
			const dataValue = value as { max?: number, min?: number, combinaison?: string };
			const statName = removeAccents(key).toLowerCase();
			if (dataValue.max && dataValue.min && dataValue.max <= dataValue.min)
				throw new Error("[error.maxGreater]");				
			if (dataValue.max && dataValue.max <= 0 ) dataValue.max = undefined;
			if (dataValue.min && dataValue.min <= 0 ) dataValue.min = undefined;
			let formula = dataValue.combinaison ? removeAccents(dataValue.combinaison).toLowerCase() : undefined;
			formula = formula && formula.trim().length > 0 ? formula : undefined;
			statistiqueTemplate.statistics[statName] = {
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
			throw new Error("[error.invalidDice]");
		}
	}

	if (!template.comparator)
		throw new Error("[error.invalidComparator]");
	if (template.comparator) {
		if (!template.comparator.sign.match(/(>|<|>=|<=|=|!=)/))
			throw new Error("[error.incorrectSign]");
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
		testFormula(statistiqueTemplate);
		testCombinaison(statistiqueTemplate);
	} catch (error) {
		throw new Error((error as Error).message);
	}

	return statistiqueTemplate;
}

function testCombinaison(template: StatisticalTemplate) {
	const onlyCombinaisonStats = Object.fromEntries(Object.entries(template.statistics).filter(([_, value]) => value.combinaison !== undefined));
	const allOtherStats = Object.fromEntries(Object.entries(template.statistics).filter(([_, value]) => !value.combinaison));	
	if (Object.keys(onlyCombinaisonStats).length===0) return;
	const allStats = Object.keys(template.statistics).filter(stat => !template.statistics[stat].combinaison);
	if (allStats.length === 0) 
		throw new Error("[error.noStat]");
	const error= [];
	for (const [stat, value] of Object.entries(onlyCombinaisonStats)) {
		let formula = value.combinaison as string;
		for (const [other, data] of Object.entries(allOtherStats)) {
			const {max, min} = data;
			const total = template.total || 100;
			const randomStatValue = generateRandomStat(total, max, min);
			const regex = new RegExp(other, "gi");
			formula = formula.replace(regex, randomStatValue.toString());
		}
		try {
			evaluate(formula);
		} catch (e) {
			error.push(stat);
		}
	}
	if (error.length > 0) 
		throw new Error(`[error.invalidFormula, common.space] ${error.join(", ")}`);
	return;
}

function testFormula(template: StatisticalTemplate) {
	const firstStatNotCombinaison = Object.keys(template.statistics).find(stat => !template.statistics[stat].combinaison);
	if (!firstStatNotCombinaison) 
		throw new Error("[error.noStat, error.onlyCombination]");
	if (!template.comparator.formula) return;
	const stats = template.statistics[firstStatNotCombinaison];
	const {min, max} = stats;
	const total = template.total || 100;
	
	const randomStatValue = generateRandomStat(total, max, min);
	const formula = template.comparator.formula.replace("$", randomStatValue.toString());	
	try {
		evaluate(formula);
		return true;
	} catch (error) {
		throw new Error("[error.invalidFormula]");
	}
}

function generateRandomStat(total: number | undefined = 100, max?: number, min?: number) {
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
	return randomStatValue;
}