/* eslint-disable @typescript-eslint/no-unused-vars */
import { Message } from "discord.js";
import { evaluate } from "mathjs";
import {Random } from "random-js";
import removeAccents from "remove-accents";

import { roll } from "../dice";
import { Statistic, StatisticalTemplate } from "../interface";
import { escapeRegex, replaceFormulaInDice } from ".";

/**
 * Verify if the provided dice work with random value
 * @param testDice {string}
 * @param stats {[name: string]: number}
 */
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
		if (!roll(replaceFormulaInDice(dice))) throw new Error(`[error.invalidDice.withoutDice, common.space] ${dice}`);
		return testDice;
	} catch (error) {
		throw new Error(`[error.invalidDice.withoutDice, common.space]: ${testDice}\n${(error as Error).message}`);
	}
}

/**
 * Generate a random dice and remove the formula (+ evaluate it)
 * Used for diceDamage only
 * @param value {string}
 * @param template {StatisticalTemplate}
 * @returns 
 */
export function diceRandomParse(value: string, template: StatisticalTemplate) {
	if (!template.statistics) return value;
	value = removeAccents(value);
	const allStats = Object.keys(template.statistics).map(stat => removeAccents(stat).toLowerCase());
	let newDice = value;
	for (const stat of allStats) {
		const regex = new RegExp(escapeRegex(stat), "gi");
		if (value.match(regex)) {
			let max: undefined | number = undefined;
			let min: undefined | number = undefined;
			const stats = template.statistics?.[stat];
			if (stats) {
				max = template.statistics[removeAccents(stat).toLowerCase()].max;
				min = template.statistics[removeAccents(stat).toLowerCase()].min;
			}
			const total = template.total || 100;
			const randomStatValue = generateRandomStat(total, max, min);
			newDice = value.replace(regex, randomStatValue.toString());
		}
	}
	return replaceFormulaInDice(newDice);
}

/**
 * Same as damageDice but for DiceType
 * @param dice {string}
 * @param template {StatisticalTemplate}
 */
export function diceTypeRandomParse(dice: string, template: StatisticalTemplate) {
	if (!template.statistics) return dice;
	const firstStatNotCombinaison = Object.keys(template.statistics).find(stat => !template.statistics?.[stat].combinaison);
	if (!firstStatNotCombinaison) return dice;
	const stats = template.statistics[firstStatNotCombinaison];
	const {min, max} = stats;
	const total = template.total || 100;
	const randomStatValue = generateRandomStat(total, max, min);
	return replaceFormulaInDice(dice.replace("$", randomStatValue.toString()));
}

/**
 * Random the combinaison and evaluate it to check if everything is valid
 * @param combinaison {[name: string]: string}
 * @param stats {[name: string]: string|number}
 */
export function evalCombinaison(combinaison: {[name: string]: string}, stats: {[name: string]: string | number}) {
	const newStats: {[name: string]: number} = {};
	for (const [stat, combin] of Object.entries(combinaison)) {
		//replace the stats in formula
		let formula = removeAccents(combin);
		for (const [statName, value] of Object.entries(stats)) {
			const regex = new RegExp(removeAccents(statName), "gi");
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

/**
 * Evaluate one selected combinaison
 * @param combinaison {string}
 * @param stats {[name: string]: string|number}
 */
export function evalOneCombinaison(combinaison: string, stats: {[name: string]: string | number}) {
	let formula = removeAccents(combinaison);
	for (const [statName, value] of Object.entries(stats)) {
		const regex = new RegExp(removeAccents(statName), "gi");
		formula = formula.replace(regex, value.toString());
	}
	try {
		return evaluate(formula);
	} catch (error) {
		throw new Error(`[error.invalidFormula, common.space]: ${combinaison}`);
	}
}

/**
 * Parse the provided JSON and verify each field to check if everything could work when rolling
 * @param {any} template 
 * @returns {StatisticalTemplate}
 */
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
			if (dataValue.max && dataValue.min && dataValue.max <= dataValue.min)
				throw new Error("[error.maxGreater]");				
			if (dataValue.max && dataValue.max <= 0 ) dataValue.max = undefined;
			if (dataValue.min && dataValue.min <= 0 ) dataValue.min = undefined;
			let formula = dataValue.combinaison ? removeAccents(dataValue.combinaison).toLowerCase() : undefined;
			formula = formula && formula.trim().length > 0 ? formula : undefined;
			if (!statistiqueTemplate.statistics) {
				statistiqueTemplate.statistics = {} as Statistic;
			}
			statistiqueTemplate.statistics[key] = {
				max: dataValue.max,
				min: dataValue.min,
				combinaison: formula || undefined,
			};
		}
	}
	if (template.diceType) {
		try {
			statistiqueTemplate.diceType = template.diceType;
			diceTypeRandomParse(template.diceType, statistiqueTemplate);
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

/**
 * Test each damage roll from the template.damage
 * @param {StatisticalTemplate} template 
 */
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

/**
 * Ensure the embeds are present
 * @param {Message} message 
 */
export function ensureEmbed(message?: Message) {
	const oldEmbeds = message?.embeds[0];
	if (!oldEmbeds || !oldEmbeds?.fields) throw new Error("[error.noEmbed]");
	return oldEmbeds;
}

/**
 * Test all combinaison with generated random value
 * @param {StatisticalTemplate} template 
 */
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

/**
 * Generate a random stat based on the template and the statistical min and max
 * @param {number|undefined} total
 * @param {number | undefined} max 
 * @param {number | undefined} min 
 * @returns 
 */
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

