/* eslint-disable no-useless-escape */
import { DiceRoller } from "@dice-roller/rpg-dice-roller";
import { TFunction } from "i18next";
import { evaluate } from "mathjs";
import dedent from "ts-dedent";

import { Compare, Modifier, Resultat, Sign } from "./interface";

export const COMMENT_REGEX = /\s+(#|\/{2}|\[|\/\*)(.*)/;
const SIGN_REGEX =/[><=!]+/;
const SIGN_REGEX_SPACE = /[><=!]+(\S+)/;

/**
 * Parse the string provided and turn it as a readable dice for dice parser
 * @param dice {string}
 */
export function roll(dice: string): Resultat | undefined{
	//parse dice string
	if (!dice.includes("d")) return undefined;
	const compareRegex = dice.match(SIGN_REGEX_SPACE);
	let compare : Compare | undefined;
	if (compareRegex) {
		dice = dice.replace(SIGN_REGEX_SPACE, "");
		const calc = compareRegex[1];
		const sign = calc.match(/[+-\/\*\^]/)?.[0];
		const compareSign = compareRegex[0].match(SIGN_REGEX)?.[0];
		if (sign) {
			const toCalc = calc.replace(SIGN_REGEX, "").replace(/\s/g, "");
			const total = evaluate(toCalc);
			dice = dice.replace(SIGN_REGEX_SPACE, `${compareSign}${total}`);
			compare = {
				sign: compareSign as "<" | ">" | ">=" | "<=" | "=" | "!=" | "==",
				value: total,
			};
		} else compare = {
			sign: compareSign as "<" | ">" | ">=" | "<=" | "=" | "!=" | "==",
			value: parseInt(calc, 10),
		};
	}
	const modifier = dice.matchAll(/(\+|\-|%|\/|\^|\*|\*{2})(\d+)/gi);
	let modificator : Modifier | undefined;
	for (const mod of modifier) {
		//calculate the modifier if multiple
		if (modificator) {
			const sign = modificator.sign;
			let value = modificator.value;
			if (sign)
				value = calculator(sign, value, parseInt(mod[2], 10));
			modificator = {
				sign: mod[1] as Sign,
				value,
			};
		} else {
			modificator = {
				sign: mod[1] as Sign,
				value: parseInt(mod[2], 10),
			};
		}
	} 
	
	if (dice.match(/\d+?#(.*)/)) {
		const diceArray = dice.split("#");
		const numberOfDice = parseInt(diceArray[0], 10);
		const diceToRoll = diceArray[1].replace(COMMENT_REGEX, "");
		const commentsMatch = diceArray[1].match(COMMENT_REGEX);
		const comments = commentsMatch ? commentsMatch[2] : undefined;
		const roller = new DiceRoller();
		//remove comments if any
		for (let i = 0; i < numberOfDice; i++) {
			roller.roll(diceToRoll);
		}
		return {
			dice: diceToRoll,
			result: roller.output,
			comment: comments,
			compare: compare ? compare : undefined,
			modifier: modificator,
		};
	}
	const roller = new DiceRoller();
	const diceWithoutComment = dice.replace(COMMENT_REGEX, "");
	roller.roll(diceWithoutComment);
	const commentMatch = dice.match(COMMENT_REGEX);
	const comment = commentMatch ? commentMatch[2] : undefined;
	return {
		dice,
		result: roller.output,
		comment,
		compare: compare ? compare : undefined,
		modifier: modificator,
	};
}
/**
 * Evaluate a formula and replace "^" by "**" if any
 * @param {Sign} sign
 * @param {number} value 
 * @param {number} total 
 * @returns 
 */
function calculator(sign: Sign, value: number, total: number): number {
	if (sign === "^") sign = "**";
	return evaluate(`${total} ${sign} ${value}`);
}

/**
 * Parse the result of the dice to be readable
 * @param {Resultat} output
 * @param {TFunction<"translation", undefined>} ul 
 * @param {failure: number | undefined, success: number | undefined}critical 
 */
export function parseResult(output: Resultat, ul: TFunction<"translation", undefined>, critical?: {failure?: number, success?: number}) {
	//result is in the form of "d% //comment: [dice] = result"
	//parse into
	let msgSuccess = `${output.result.replaceAll(";", "\n").replaceAll(":", " ⟶").replaceAll(/ = (\d+)/g, " = ` $1 `").replaceAll("*", "\\*")}`;
	const messageResult = output.result.split(";");
	let succ = "";
	if (output.compare) {
		msgSuccess = "";
		let total = 0;
		for (const r of messageResult) {
			const tot = r.match(/\[(.*)\]/);
			if (tot) {
				//detect all number in the tot
				const totalValue = tot[1].replaceAll("*", "").split(",");
				for (const t of totalValue) {
					total += parseInt(t, 10);
				}
			}
			if (output.modifier) {
				const {sign, value} = output.modifier;
				total = calculator(sign as Sign, value, total);

			}
			succ = evaluate(`${total} ${output.compare.sign} ${output.compare.value}`) ? `**${ul("roll.success")}**` : `**${ul("roll.failure")}**`;
			if (critical) {
				if (critical.failure && total === critical.failure) {
					succ = `**${ul("roll.critical.failure")}**`;
				} else if (critical.success && total === critical.success) {
					succ = `**${ul("roll.critical.success")}**`;
				}
			}
			const totSucc = output.compare ? ` = \`${total} ${goodCompareSign(output.compare, total)} [${output.compare.value}]\`` : `= \`${total}\``;
			msgSuccess += `\n${succ} — ${r.replaceAll(":", " ⟶").replaceAll(/ = (\S+)/g, totSucc).replaceAll("*", "\\*")}`;
			total = 0;
		}
	} else {
		msgSuccess = `${output.result.replaceAll(";","\n").replaceAll(":", " ⟶").replaceAll(/ = (\S+)/g, " = ` $1 `").replaceAll("*", "\\*")}`;
	}
	const result = msgSuccess;
	const comment = output.comment ? `*${output.comment.replaceAll(/(\\\*|#|\*\/|\/\*)/g, "").trim()}*\n` : "";
	return dedent(`${comment}${result}`);
}

/**
 * Replace the compare sign as it will invert the result for a better reading
 * As the comparaison is after the total (like 20>10)
 * @param {Compare} compare 
 * @param {number} total
 */
function goodCompareSign(compare: Compare, total: number): "<" | ">" | "≥" | "≤" | "=" | "!=" | "==" | "" {
	//as the comparaison value is AFTER the total, we need to invert the sign to have a good comparaison string
	const {sign, value} = compare;
	const success = eval(`${total} ${sign} ${value}`);
	if (success) {
		return sign.replace(">=", "≥").replace("<=", "≤") as "<" | ">" | "≥" | "≤" | "=" | "" | "!=" | "==";
	}
	switch (sign) {
	case "<":
		return ">";
	case ">":
		return "<";
	case ">=":
		return "≤";
	case "<=":
		return "≥";
	case "=":
		return "=";
	case "!=":
		return "!=";
	case "==":
		return "==";
	default:
		return "";
	}
}