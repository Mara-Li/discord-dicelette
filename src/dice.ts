import { DiceRoller } from "@dice-roller/rpg-dice-roller";
import dedent from "ts-dedent";

import { Compare, Modifier, Resultat, Sign } from "./interface";

export const COMMENT_REGEX = /\s+(#|\/{2}|\[|\/\*)(.*)/;
const SIGN_REGEX =/[><=]=?/;


export function roll(dice: string): Resultat | undefined{
	//parse dice string
	if (!dice.includes("d")) return undefined;
	const compareRegex = dice.match(/[><=]=?(\S+)/);
	let compare : Compare | undefined;
	if (compareRegex) {
		dice = dice.replace(/[><=]=?(\S+)/, "");
		const calc = compareRegex[1];
		const sign = calc.match(/[+-\/\*\^]/)?.[0];
		const compareSign = compareRegex[0].match(SIGN_REGEX)?.[0];
		if (sign) {
			const toCalc = calc.replace(SIGN_REGEX, "").replace(/\s/g, "");
			const total = eval(toCalc);
			dice = dice.replace(/[><=]=?(\S+)/, `${compareSign}${total}`);
			compare = {
				sign: compareSign as "<" | ">" | ">=" | "<=" | "=",
				value: total,
			};
		} else compare = {
			sign: compareSign as "<" | ">" | ">=" | "<=" | "=",
			value: parseInt(calc),
		};
	}
	const modifier = dice.match(/(\+|\-|%|\/|\^|\*|\*{2})(\d+)/);
	let modificator : Modifier | undefined;
	if (modifier) {
		modificator = {
			sign: modifier[1] as Sign,
			value: parseInt(modifier[2]),
		};
	}

	if (dice.match(/\d+?#(.*)/)) {
		const diceArray = dice.split("#");
		const numberOfDice = parseInt(diceArray[0]);
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

function calculator(sign: Sign, value: number, total: number): number {
	if (sign === "^") sign = "**";
	return eval(`${total} ${sign} ${value}`);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseResult(output: Resultat, lng: any) {
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
					total += parseInt(t);
				}
			}
			if (output.modifier) {
				const {sign, value} = output.modifier;
				total = calculator(sign as Sign, value, total);

			}
			succ = eval(`${total} ${output.compare.sign} ${output.compare.value}`) ? `**${lng.roll.success}**` : `**${lng.roll.failure}**`;
			const totSucc = output.compare ? ` = \`${total} ${goodCompareSign(output.compare, total)} [${output.compare.value}]\`` : `= \`${total}\``;
			msgSuccess += `\n${succ} — ${r.replaceAll(":", " ⟶").replaceAll(/ = (\S+)/g, totSucc).replaceAll("*", "\\*")}`;
			total = 0;
		}
	} else {
		msgSuccess = `${output.result.replaceAll(";","\n").replaceAll(":", " ⟶").replaceAll(/ = (\S+)/g, " = ` $1 `").replaceAll("*", "\\*")}`;
	}
	const result = msgSuccess;
	const comment = output.comment ? `*${output.comment.replaceAll(/[\*\/#]/g, "").trim()}*` : "";
	return dedent(`${comment}${result}`);
}

function goodCompareSign(compare: Compare, total: number): "<" | ">" | "≥" | "≤" | "=" | "" {
	//as the comparaison value is AFTER the total, we need to invert the sign to have a good comparaison string
	const {sign, value} = compare;
	const success = eval(`${total} ${sign} ${value}`);
	if (success) {
		return sign.replace(">=", "≥").replace("<=", "≤") as "<" | ">" | "≥" | "≤" | "=" | "";
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
	default:
		return "";
	}
}