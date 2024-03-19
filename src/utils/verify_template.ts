/* eslint-disable @typescript-eslint/no-unused-vars */
import { evaluate } from "mathjs";
import {Random } from "random-js";
import removeAccents from "remove-accents";

import { roll } from "../dice";
import { Statistic, StatisticalTemplate } from "../interface";
import { escapeRegex, replaceFormulaInDice } from ".";

export function evalStatsDice(testDice: string, stats?: {[name: string]: number}) {
	let dice = testDice;
	if (stats && Object.keys(stats).length > 0) {
		const allStats = Object.keys(stats);
		for (const stat of allStats) {
			const regex = new RegExp(escapeRegex(removeAccents(stat)), "gi");
			if (testDice.match(regex)) {
				const statValue = stats[stat];
				dice = testDice.replace(regex, statValue.toString());
			}
		}
	}	
	try {
		roll(replaceFormulaInDice(dice));
		return testDice;
	} catch (error) {
		throw new Error(`[error.invalidDice, common.space]: ${testDice}\n${(error as Error).message}`);
	}
}

export function diceRandomParse(value: string, template: StatisticalTemplate) {
	if (!template.statistics) return value;
	const allStats = Object.keys(template.statistics);
	let newDice = value;
	for (const stat of allStats) {
		const regex = new RegExp(escapeRegex(removeAccents(stat)), "gi");
		if (value.match(regex)) {
			const {max, min} = template.statistics[stat];
			const total = template.total || 100;
			const randomStatValue = generateRandomStat(total, max, min);
			newDice = value.replace(regex, randomStatValue.toString());
		}
	}
	return replaceFormulaInDice(newDice);
}

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
		diceType: "",
		statistics: {} as Statistic
	};
	if (!template.statistics) statistiqueTemplate.statistics = undefined;
	else if (template.statistics && Object.keys(template.statistics).length > 0) {
		for (const [key, value] of Object.entries(template.statistics)) {
			const dataValue = value as { max?: number, min?: number, combinaison?: string };
			const statName = removeAccents(key).toLowerCase();
			if (dataValue.max && dataValue.min && dataValue.max <= dataValue.min)
				throw new Error("[error.maxGreater]");				
			if (dataValue.max && dataValue.max <= 0 ) dataValue.max = undefined;
			if (dataValue.min && dataValue.min <= 0 ) dataValue.min = undefined;
			let formula = dataValue.combinaison ? removeAccents(dataValue.combinaison).toLowerCase() : undefined;
			formula = formula && formula.trim().length > 0 ? formula : undefined;
			if (!statistiqueTemplate.statistics) {
				statistiqueTemplate.statistics = {} as Statistic;
			}
			statistiqueTemplate.statistics[statName] = {
				max: dataValue.max,
				min: dataValue.min,
				combinaison: formula || undefined,
			};
		}
	}
	if (template.diceType) {
		try {
			statistiqueTemplate.diceType = template.diceType;
			testFormula(statistiqueTemplate);
		} catch (e) {
			throw new Error((e as Error).message);
		}
	}

	
	if (template.critical && Object.keys(template.critical).length > 0){
		statistiqueTemplate.critical = {
			failure: template.critical.failure ?? undefined,
			success: template.critical.success ?? undefined
		};

	}
	if (template.total) {
		if (template.total <= 0)
			template.total = undefined;
		statistiqueTemplate.total = template.total;
	}
	if (template.charName) statistiqueTemplate.charName = template.charName;
	if (template.damage) statistiqueTemplate.damage = template.damage;
	try {
		testDamageRoll(statistiqueTemplate);
		testCombinaison(statistiqueTemplate);
	} catch (error) {
		throw new Error((error as Error).message);
	}
	return statistiqueTemplate;
}

export function testDamageRoll(template: StatisticalTemplate) {
	if (!template.damage) return;
	if (Object.keys(template.damage).length === 0) throw new Error("[error.emptyObject]");
	if (Object.keys(template.damage).length > 25) throw new Error("[error.tooManyDice]");
	for (const [name, dice] of Object.entries(template.damage)) {
		if (!dice) continue;
		const randomDiceParsed = diceRandomParse(dice, template);
		try {
			roll(randomDiceParsed);
		} catch (error) {
			throw new Error(`[error.invalidDice, common.space] ${name}`);
		}
	}
}

export function testCombinaison(template: StatisticalTemplate) {
	if (!template.statistics) return;
	const onlyCombinaisonStats = Object.fromEntries(Object.entries(template.statistics).filter(([_, value]) => value.combinaison !== undefined));
	const allOtherStats = Object.fromEntries(Object.entries(template.statistics).filter(([_, value]) => !value.combinaison));	
	if (Object.keys(onlyCombinaisonStats).length===0) return;
	const allStats = Object.keys(template.statistics).filter(stat => !template.statistics![stat].combinaison);
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

export function getFormula(diceType?: string) {
	if (!diceType) return undefined;
	const regex = /(?<formula>\{{2}(.+?)\}{2})(?<comparison>(?<sign>[><=]=?)?(?<compare>.*)?)?/gmi;
	const formula = regex.exec(diceType);
	const combinaison: {formula?: string; sign?: string; comparator?: string;}|undefined = {};
	if (!formula) {
		//search sign 
		const sign = /(?<sign>[><=]=?)(?<compare>(.*))/gmi.exec(diceType);
		if (sign?.groups) {
			if (sign.groups.sign) combinaison.sign = sign.groups.sign;
			if (sign.groups.compare) combinaison.comparator = sign.groups.compare;
		} else return undefined;
		return combinaison;
	}
	if (formula?.groups?.formula) {
		combinaison.formula = formula?.groups?.formula.replaceAll("{{", "").replaceAll("}}", "");
	}
	if (formula?.groups?.comparison) {
		combinaison.sign = formula?.groups?.sign;
		combinaison.comparator = formula?.groups?.compare;
	}
	return combinaison;
}

export function testFormula(template: StatisticalTemplate) {
	if (!template.statistics || !template.diceType) return;
	const firstStatNotCombinaison = Object.keys(template.statistics).find(stat => !template.statistics?.[stat].combinaison);
	if (!firstStatNotCombinaison) return;
	const stats = template.statistics[firstStatNotCombinaison];
	const {min, max} = stats;
	const total = template.total || 100;
	
	const randomStatValue = generateRandomStat(total, max, min);
	const formula = getFormula(template.diceType);
	if (!formula) {
		try {
			roll(template.diceType);
			return true;
		} catch(e) {
			throw new Error(`[error.invalidDice] ${template.diceType}`);
		}
	}
	
	const formule = formula.formula?.replace("$", randomStatValue.toString());
	const compareFormule = formula.comparator?.replaceAll("$", randomStatValue.toString());
	try {
		let newDice = template.diceType;
		if (formule && formula.formula){
			const value = evaluate(formule);
			const regexOriginalFormula = new RegExp(`\\{\\{${escapeRegex(formula.formula)}\\}\\}`, "gmi");
			const valueString = value > 0 ? `+${value}` : value.toString();
			newDice = newDice.replace(regexOriginalFormula, valueString);
		}
		if (compareFormule && formula.comparator) {
			const value = evaluate(compareFormule);
			newDice = newDice.replace(formula.comparator, value.toString());
		}
		roll(newDice);
		return true;
	} catch (error) {
		throw new Error(`[error.invalidFormula] ${JSON.stringify(formula)}`);
	}
	
}

export function generateRandomStat(total: number | undefined = 100, max?: number, min?: number) {
	let randomStatValue = total + 1;
	while (randomStatValue >= total) {
		const random = new Random();
		if (max && min)
			randomStatValue = random.integer(min, max);
		else if (max)
			randomStatValue = random.integer(0, max);
		else if (min)
			randomStatValue = random.integer(min, total);
		else
			randomStatValue = random.integer(0, total);
	}
	return randomStatValue;
}

