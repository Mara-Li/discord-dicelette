import { DiceRoller } from "@dice-roller/rpg-dice-roller";
import dedent from "ts-dedent";

import { Resultat } from "./interface";

export const COMMENT_REGEX = /\s+(#|\/{2}|\[|\/\*)(.*)/;

export function roll(dice: string): Resultat | undefined{
	//parse dice string
	if (!dice.includes("d")) return undefined;
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
		total: roller.total,
	};
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseResult(output: Resultat, lng: any) {
	//result is in the form of "d% //comment: [dice] = result"
	//parse into
	let msgSuccess = `${output.result.replaceAll(";", "\n").replaceAll(":", " ⟶").replaceAll(/ = (\d+)/g, " = ` $1 `").replaceAll("*", "\\*")}`;
	const messageResult = output.result.split(";");
	let succ = "";
	if (output.dice.match(/[><=>]/g)) {
		msgSuccess = "";
		let total = 0;
		for (const r of messageResult) {
			const result = r.match(/[><=>](\d+)/);
			const tot = r.match(/\[(.*)\]/);
			if (tot) {
				//detect all number in the tot
				const totalValue = tot[1].replaceAll("*", "").split(",");
				for (const t of totalValue) {
					total += parseInt(t);
				}
			}
			if (result) {
				const numberOfSuccess = parseInt(result[1]);
				succ = total >= numberOfSuccess ? `**${lng.roll.success}**` : `**${lng.roll.failure}**`;
			}
			msgSuccess += `\n${succ} — ${r.replaceAll(":", " ⟶").replaceAll(/ = (\d+)/g, ` = \` ${total} \``).replaceAll("*", "\\*")}`;
			total = 0;
		}
	} else {
		msgSuccess = `${output.result.replaceAll(";","\n").replaceAll(":", " ⟶").replaceAll(/ = (\d+)/g, " = ` $1 `").replaceAll("*", "\\*")}`;
	}
	const result = msgSuccess;
	const comment = output.comment ? `*${output.comment.replaceAll(/[\*\/#]/g, "").trim()}*` : "";
	return dedent(`${comment}${result}`);
}
