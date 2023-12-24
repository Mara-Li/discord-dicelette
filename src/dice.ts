import { DiceRoller, exportFormats } from "@dice-roller/rpg-dice-roller";
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
	//@ts-ignore
	console.log(realTotal(roller));
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
	let msgSuccess = "";
	const messageResult = output.result.split(";");
	let succ = "";
	if (output.dice.match(/[><=>]/g)) {
		for (const r of messageResult) {
			const result = r.match(/= (\d+)/);
			if (result) {
				const numberOfSuccess = parseInt(result[1]);
				if (numberOfSuccess > 0) {
					succ = `**${lng.roll.success}**`;
				} else if (numberOfSuccess === 0) {
					succ = `**${lng.roll.failure}**`;
				}
			}
			msgSuccess += `\n${succ} — ${r.replaceAll(":", " ⟶").replaceAll(/ = (\d+)/g, " = ` $1 `").replaceAll("*", "\\*")}`;
		}
	} else {
		msgSuccess = `\n${output.result.replaceAll(":", " ⟶").replaceAll(/ = (\d+)/g, " = ` $1 `").replaceAll("*", "\\*")}`;
	}
	const result = `\n${msgSuccess}`;
	const comment = output.comment ? `*${output.comment.replaceAll(/[\*\/#]/g, "").trim()}*` : "";
	return dedent(`${comment}${result}`);
}

function realTotal(roll: DiceRoller) {
	//@ts-ignore
	console.log(roll.rolls);
	//@ts-ignore
	const log = roll.export(exportFormats.OBJECT).log;
	const rolls = log.map((roll: { rolls: any; }) => roll.rolls);
	console.log(rolls);
	const total = 0;

	return total;
}