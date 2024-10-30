import type { Compare, Resultat } from "@dicelette/core";
import type { Translation } from "@interfaces/discord";
import { evaluate } from "mathjs";
import { logger } from "./index";

/**
 * Parse the result of the dice to be readable
 */
export function parseResult(
	output: Resultat,
	ul: Translation,
	critical?: { failure?: number; success?: number },
	interaction?: boolean
) {
	//result is in the form of "d% //comment: [dice] = result"
	//parse into
	const regexForFormulesDices = /^[✕◈✓]/;
	let msgSuccess: string;
	const messageResult = output.result.split(";");
	let successOrFailure = "";
	let isCritical: undefined | "failure" | "success" = undefined;
	if (output.compare) {
		msgSuccess = "";
		let total = 0;
		const natural: number[] = [];
		for (const r of messageResult) {
			if (r.match(regexForFormulesDices)) {
				msgSuccess += `${r
					.replaceAll(";", "\n")
					.replaceAll(":", " ⟶")
					.replaceAll(/ = (\S+)/g, " = ` $1 `")
					.replaceAll("*", "\\*")}\n`;
				continue;
			}
			const tot = r.match(/ = (\d+)/);
			if (tot) {
				total = Number.parseInt(tot[1], 10);
			}

			successOrFailure = evaluate(
				`${total} ${output.compare.sign} ${output.compare.value}`
			)
				? `**${ul("roll.success")}**`
				: `**${ul("roll.failure")}**`;
			// noinspection RegExpRedundantEscape
			const naturalDice = r.matchAll(/\[(\d+)\]/gi);
			for (const dice of naturalDice) {
				natural.push(Number.parseInt(dice[1], 10));
			}
			if (critical) {
				if (critical.failure && natural.includes(critical.failure)) {
					successOrFailure = `**${ul("roll.critical.failure")}**`;
					isCritical = "failure";
				} else if (critical.success && natural.includes(critical.success)) {
					successOrFailure = `**${ul("roll.critical.success")}**`;
					isCritical = "success";
				}
			}
			const totalSuccess = output.compare
				? ` = \`${total} ${goodCompareSign(output.compare, total)} [${output.compare.value}]\``
				: `= \`${total}\``;
			msgSuccess += `${successOrFailure} — ${r
				.replaceAll(":", " ⟶")
				.replaceAll(/ = (\S+)/g, totalSuccess)
				.replaceAll("*", "\\*")}\n`;
			total = 0;
		}
	} else {
		msgSuccess = `${output.result
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
	const dicesResult = /(?<entry>\S+) ⟶ (?<calc>.*) =/;
	const splitted = msgSuccess.split("\n");
	const finalRes = [];
	for (let res of splitted) {
		const matches = dicesResult.exec(res);
		if (matches) {
			const { entry, calc } = matches.groups || {};
			if (entry) {
				const entryStr = entry.replaceAll("\\*", "×");
				res = res.replace(entry, `\`${entryStr}\``);
			}
			if (calc) {
				const calcStr = calc.replaceAll("\\*", "×");
				res = res.replace(calc, `\`${calcStr}\``);
			}
		}
		logger.silly(isCritical);
		if (isCritical === "failure") {
			res = res.replace(regexForFormulesDices, `**${ul("roll.critical.failure")}** —`);
		} else if (isCritical === "success") {
			res = res.replace(regexForFormulesDices, `**${ul("roll.critical.success")}** —`);
		} else {
			res = res
				.replace("✕", `**${ul("roll.failure")}** —`)
				.replace("✓", `**${ul("roll.success")}** —`);
		}

		finalRes.push(res);
	}
	return `${comment}  ${finalRes.join("\n  ").trimEnd()}`;
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
