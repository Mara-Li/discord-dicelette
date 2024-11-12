import { cmdLn, ln } from "@localization/index";
import * as Djs from "discord.js";
import i18next from "i18next";
import type { EClient } from "../index";

const t = i18next.getFixedT("en");

export const contextMenus = [
	new Djs.ContextMenuCommandBuilder()
		.setName(t("copyRollResult.mobile.name"))
		.setNameLocalizations(cmdLn("copyRollResult.mobile.name"))
		.setDMPermission(false)
		//@ts-ignore
		.setType(Djs.ApplicationCommandType.Message),
	new Djs.ContextMenuCommandBuilder()
		.setName(t("copyRollResult.desktop.name"))
		.setNameLocalizations(cmdLn("copyRollResult.desktop.name"))
		.setDMPermission(false)
		//@ts-ignore
		.setType(Djs.ApplicationCommandType.Message),
];
export async function commandMenu(
	interaction: Djs.MessageContextMenuCommandInteraction,
	client: EClient,
	desktop?: boolean
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
	const regexResultForRoll = /= `(?<result>.*)`/gi;

	let match: RegExpExecArray | null;
	const res = [];
	while ((match = regexResultForRoll.exec(message)) != null) {
		res.push(`\`${match.groups?.result.trim()}\``);
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
	const generateMessage = `[[${stats ? `${stats}${ul("common.space")}: ` : ""}${res.join(" ; ")}]]`;
	if (!savedDice) savedDice = interaction.targetMessage.url;
	const finalLink = `${generateMessage}(<${savedDice}>)`;

	if (desktop) {
		await interaction.reply({
			content: `${ul("copyRollResult.desktop.info")}\n\n\`\`${finalLink}\`\``,
			ephemeral: true,
		});
	} else {
		await interaction.reply({
			content: ul("copyRollResult.mobile.info"),
			ephemeral: true,
		});
		await interaction.followUp({
			content: `${finalLink}`,
			ephemeral: true,
		});
	}
}
