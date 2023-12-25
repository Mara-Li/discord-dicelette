import { DiceRoller } from "@dice-roller/rpg-dice-roller";
import dedent from "ts-dedent";

import { Modifier, Resultat } from "./interface";

export const COMMENT_REGEX = /\s+(#|\/{2}|\[|\/\*)(.*)/;

export function roll(dice: string): Resultat | undefined{
	//parse dice string
	if (!dice.includes("d")) return undefined;
	const compare = dice.match(/[><=](\d+)/);
	if (compare) {
		dice = dice.replace(/[><=](\d+)/, "");
	}
	const modifier = dice.match(/(\+|\-|%|\/|\^|\*|\*{2})(\d+)/);
	let modificator : Modifier | undefined;
	if (modifier) {
		modificator = {
			sign: modifier[1],
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
			compare: compare ? parseInt(compare[1]) : undefined,
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
		compare: compare ? parseInt(compare[1]) : undefined,
		modifier: modificator,
	};
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseResult(output: Resultat, lng: any) {
	//result is in the form of "d% //comment: [dice] = result"
	//parse into
	let msgSuccess = `${output.result.replaceAll(";", "\n").replaceAll(":", " ⟶").replaceAll(/ = (\d+)/g, " = ` $1 `").replaceAll("*", "\\*")}`;
	const messageResult = output.result.split(";");
	let succ = "";
	console.log(output);
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
				switch (sign) {
				case "+":
					total += value;
					break;
				case "-":
					total -= value;
					break;
				case "*":
					total *= value;
					break;
				case "/":
					total /= value;
					break;
				case "%":
					total %= value;
					break;
				case "^":
					total **= value;
					break;
				case "**":
					total **= value;
					break;
				default:
					break;
				}

			}
			succ = total >= output.compare ? `**${lng.roll.success}**` : `**${lng.roll.failure}**`;
			msgSuccess += `\n${succ} — ${r.replaceAll(":", " ⟶").replaceAll(/ = (\S+)/g, ` = \` ${total} \``).replaceAll("*", "\\*")}`;
			total = 0;
		}
	} else {
		msgSuccess = `${output.result.replaceAll(";","\n").replaceAll(":", " ⟶").replaceAll(/ = (\S+)/g, " = ` $1 `").replaceAll("*", "\\*")}`;
	}
	const result = msgSuccess;
	const comment = output.comment ? `*${output.comment.replaceAll(/[\*\/#]/g, "").trim()}*` : "";
	return dedent(`${comment}${result}`);
}
