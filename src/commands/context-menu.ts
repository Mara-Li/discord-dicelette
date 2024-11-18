import type { Translation } from "@interfaces/discord";
import { cmdLn, findAllTranslation, ln } from "@localization";
import type { EClient } from "@main";
import * as Djs from "discord.js";
import i18next from "i18next";

const t = i18next.getFixedT("en");
const critical = criticalRegex();

export const contextMenus = [
	new Djs.ContextMenuCommandBuilder()
		.setName(t("copyRollResult.name"))
		.setNameLocalizations(cmdLn("copyRollResult.name"))
		.setDMPermission(false)
		//@ts-ignore
		.setType(Djs.ApplicationCommandType.Message),
];
export async function commandMenu(
	interaction: Djs.MessageContextMenuCommandInteraction,
	client: EClient
) {
	const lang = client.settings.get(interaction!.guild!.id, "lang") ?? interaction.locale;
	const ul = ln(lang);
	if (interaction.targetMessage.author.id !== client.user?.id) {
		await interaction.reply({
			content: ul("copyRollResult.error.notBot"),
		});
		return;
	}
	const message = interaction.targetMessage.content;
	const messageUrl = interaction.targetMessage.url;

	const link = await finalLink(interaction, message, messageUrl, ul);
	await interaction.reply({
		content: `${ul("copyRollResult.info")}\n\n\`\`${link}\`\``,
		ephemeral: true,
	});

	await interaction.followUp({
		content: `${link}`,
		ephemeral: true,
	});
}

async function finalLink(
	interaction: Djs.MessageContextMenuCommandInteraction | Djs.ButtonInteraction,
	message: string,
	messageUrl: string,
	ul: Translation
) {
	const regexResultForRoll = /= `(?<result>.*)`/gi;

	const list = message.split("\n");
	const res: string[] = [];
	for (const line of list) {
		if (!line.startsWith("  ")) continue;
		const match = regexResultForRoll.exec(line)?.groups?.result;
		const compare = critical.exec(line)?.groups?.compare;
		if (match && compare) {
			res.push(`**${compare.trim()}** — \`${match.trim()}\``);
		} else if (match) {
			res.push(`\`${match.trim()}\``);
		}
	}

	if (res.length === 0) {
		await interaction.reply({
			content: ul("copyRollResult.error.noResult"),
		});
		return;
	}

	const statsReg = /\[__(?<stats>.*)__]/gi;
	const stats = statsReg.exec(message)?.groups?.stats;

	const regexSavedDice =
		/-# ↪ (?<saved>https:\/\/discord\.com\/channels\/\d+\/\d+\/\d+)/gi;
	let savedDice = regexSavedDice.exec(message)?.groups?.saved;
	const generateMessage = `[[${stats ? `__${stats}__${ul("common.space")}: ` : ""}${res.join(" ; ")}]]`;
	if (!savedDice) savedDice = messageUrl;
	return `${generateMessage}(<${savedDice}>)`;
}

export async function mobileLink(interaction: Djs.ButtonInteraction, ul: Translation) {
	const message = interaction.message.content;
	const messageUrl = interaction.message.url;
	//check user mobile or desktop
	const link = await finalLink(interaction, message, messageUrl, ul);
	await interaction.reply({
		content: link,
		ephemeral: true,
	});
}

export async function desktopLink(interaction: Djs.ButtonInteraction, ul: Translation) {
	const message = interaction.message.content;
	const messageUrl = interaction.message.url;
	const link = await finalLink(interaction, message, messageUrl, ul);
	await interaction.reply({
		content: `\`\`${link}\`\``,
		ephemeral: true,
	});
}

export function criticalRegex() {
	const failure = "roll.critical.failure";
	const success = "roll.critical.success";
	const failTranslation = findAllTranslation(failure);
	//create a list
	const failList = Object.values(failTranslation)
		.map((value) => value?.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&"))
		.filter((value) => value != null);
	const successTranslation = findAllTranslation(success);
	const successList = Object.values(successTranslation)
		.map((value) => value?.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&"))
		.filter((value) => value != null);
	//concatenate the list
	const criticalList = failList.concat(successList);
	//escape the special characters
	const joined = criticalList.join("|");
	return new RegExp(` {2}\\*{2}(?<compare>${joined})\\*{2} — `, "gi");
}
