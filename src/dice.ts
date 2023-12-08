import { DiceRoller, exportFormats } from '@dice-roller/rpg-dice-roller';
import dedent from 'ts-dedent';
import { Resultat } from './interface';

export function roll(dice: string): Resultat {
	//parse dice string
	if (dice.match(/\d+?#(.*)/)) {
		const diceArray = dice.split("#");
		const numberOfDice = parseInt(diceArray[0]);
		const diceToRoll = diceArray[1].replace(/\s+(#|\/{2}|\[|\/\*)(.*)/, "");
		const commentsMatch = diceArray[1].match(/\s+(#|\/{2}|\[|\/\*)(.*)/);
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
	roller.roll(dice);
	const commentMatch = dice.match(/\s+(#|\/{2}|\[|\/\*)(.*)/);
	const comment = commentMatch ? commentMatch[2] : undefined;
	return {
		dice,
		result: roller.output,
		comment,
	};
}

export function parseResult(output: Resultat) {
	//result is in the form of "d% //comment: [dice] = result"
	//parse into
	const result = `\n${output.result.replaceAll("; ", "\n").replaceAll(':', ' ⟶ ').replaceAll(/ = (\d+)/g, ' = ` $1 `')}`;
	const comment = output.comment ? `*${output.comment}*` : "";
	return dedent(`${comment}${result}`);
}

