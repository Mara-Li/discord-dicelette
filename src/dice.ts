import type { Compare, Resultat } from "@dicelette/core";
import type { Translation } from "@interface";
import { evaluate } from "mathjs";

/**
 * Parse the result of the dice to be readable
 * @param {Resultat} output
 * @param {Translation} ul
 * @param {failure: number | undefined, success: number | undefined} critical
 */
export function parseResult(
	output: Resultat,
	ul: Translation,
	critical?: { failure?: number; success?: number },
	interaction?: boolean
) {
	//result is in the form of "d% //comment: [dice] = result"
	//parse into
	let msgSuccess = `${output.result
		.replaceAll(";", "\n")
		.replaceAll(":", " ⟶")
		.replaceAll(/ = (\d+)/g, " = ` $1 `")
		.replaceAll("*", "\\*")}`;
	const messageResult = output.result.split(";");
	let succ = "";
	if (output.compare) {
		msgSuccess = "";
		let total = 0;
		const natural: number[] = [];
		for (const r of messageResult) {
			const tot = r.match(/ = (\d+)/);
			if (tot) {
				total = Number.parseInt(tot[1], 10);
			}

			succ = evaluate(`${total} ${output.compare.sign} ${output.compare.value}`)
				? `**${ul("roll.success")}**`
				: `**${ul("roll.failure")}**`;
			const naturalDice = r.matchAll(/\[(\d+)\]/gi);
			for (const dice of naturalDice) {
				natural.push(Number.parseInt(dice[1], 10));
			}
			if (critical) {
				if (critical.failure && natural.includes(critical.failure)) {
					succ = `**${ul("roll.critical.failure")}**`;
				} else if (critical.success && natural.includes(critical.success)) {
					succ = `**${ul("roll.critical.success")}**`;
				}
			}
			const totSucc = output.compare
				? ` = \`${total} ${goodCompareSign(output.compare, total)} [${output.compare.value}]\``
				: `= \`${total}\``;
			msgSuccess += `  ${succ} — ${r
				.replaceAll(":", " ⟶")
				.replaceAll(/ = (\S+)/g, totSucc)
				.replaceAll("*", "\\*")}`;
			total = 0;
		}
	} else {
		msgSuccess = `  ${output.result
			.replaceAll(";", "\n")
			.replaceAll(":", " ⟶")
			.replaceAll(/ = (\S+)/g, " = ` $1 `")
			.replaceAll("*", "\\*")}`;
	}
	const comment = output.comment
		? `*${output.comment
				.replaceAll(/(\\\*|#|\*\/|\/\*)/g, "")
				.replaceAll("×", "*")
				.trim()}*\n`
		: interaction
			? "\n"
			: "";
	const dicesResult = / {2}(?<entry>.*) ⟶ (?<calc>.*) =/;
	const matches = dicesResult.exec(msgSuccess);
	console.log(matches);
	if (matches) {
		if (matches?.groups?.entry) {
			const entry = matches.groups.entry.replaceAll("\\*", "×");
			msgSuccess = msgSuccess.replace(matches.groups.entry, `\`${entry}\``);
		}
		if (matches?.groups?.calc) {
			const calc = matches.groups.calc.replaceAll("\\*", "×");
			msgSuccess = msgSuccess.replace(matches.groups.calc, `\`${calc}\``);
		}
	}
	return `${comment}${msgSuccess}`;
}

/**
 * Replace the compare sign as it will invert the result for a better reading
 * As the comparaison is after the total (like 20>10)
 * @param {Compare} compare
 * @param {number} total
 */
function goodCompareSign(
	compare: Compare,
	total: number
): "<" | ">" | "≥" | "≤" | "=" | "!=" | "==" | "" {
	//as the comparaison value is AFTER the total, we need to invert the sign to have a good comparaison string
	const { sign, value } = compare;
	const success = evaluate(`${total} ${sign} ${value}`);
	if (success) {
		return sign.replace(">=", "≥").replace("<=", "≤") as
			| "<"
			| ">"
			| "≥"
			| "≤"
			| "="
			| ""
			| "!="
			| "==";
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
