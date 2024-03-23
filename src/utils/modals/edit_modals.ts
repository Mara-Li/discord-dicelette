import { ActionRowBuilder, ButtonInteraction, Embed, ModalActionRowComponentBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import { TFunction } from "i18next";

import { cleanStatsName, isArrayEqual, title } from "..";
import { getGuildData } from "../db";
import { getEmbeds, parseEmbedFields } from "../embeds/parse";

export async function showEditorStats(interaction: ButtonInteraction, ul: TFunction<"translation", undefined>) {
	const statistics = getEmbeds(ul, interaction.message, "stats");
	if (!statistics) throw new Error(ul("error.statNotFound"));
	const stats = parseEmbedFields(statistics.toJSON() as Embed);
	const originalGuildData = getGuildData(interaction)?.templateID.statsName;
	const registeredStats = originalGuildData?.map(stat => cleanStatsName(stat));
	const userStats = Object.keys(stats).map(stat => cleanStatsName(stat.toLowerCase()));
	let statsStrings = "";
	for (const [name, value] of Object.entries(stats)) {
		let stringValue = value;
		if (!registeredStats?.includes(cleanStatsName(name))) continue; //remove stats that are not registered
		if (value.match(/`(.*)`/)) {
			const combinaison = value.match(/`(.*)`/)?.[1];
			if (combinaison) stringValue = combinaison;
		}
		statsStrings += `- ${name}${ul("common.space")}: ${stringValue}\n`;
	}
	if (!isArrayEqual(registeredStats, userStats) && registeredStats && registeredStats.length > userStats.length) {
		//check which stats was added
		const diff = registeredStats.filter(x => !userStats.includes(x));
		for (const stat of diff) {
			const realName = originalGuildData?.find(x => cleanStatsName(x) === cleanStatsName(stat));
			statsStrings += `- ${title(realName)}${ul("common.space")}: 0\n`;
		}
	}

	const modal = new ModalBuilder()
		.setCustomId("editStats")
		.setTitle(title(ul("common.statistic")));
	const input = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
		new TextInputBuilder()
			.setCustomId("allStats")
			.setLabel(ul("modals.edit.stats"))
			.setRequired(true)
			.setStyle(TextInputStyle.Paragraph)
			.setValue(statsStrings),
	);
	modal.addComponents(input);
	await interaction.showModal(modal);
}

export async function showEditDice(interaction: ButtonInteraction, ul: TFunction<"translation", undefined>) {
	const diceEmbed = getEmbeds(ul, interaction.message, "damage");
	if (!diceEmbed) throw new Error(ul("error.invalidDice.embeds"));
	const diceFields = parseEmbedFields(diceEmbed.toJSON() as Embed);
	let dices = "";
	for (const [skill, dice] of Object.entries(diceFields)) {
		dices += `- ${skill}${ul("common.space")}: ${dice}\n`;
	}
	const modal = new ModalBuilder()
		.setCustomId("editDice")
		.setTitle(title(ul("common.dice")));
	const input = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
		new TextInputBuilder()
			.setCustomId("allDice")
			.setLabel(ul("modals.edit.dice"))
			.setRequired(true)
			.setStyle(TextInputStyle.Paragraph)
			.setValue(dices),
	);
	modal.addComponents(input);
	await interaction.showModal(modal);
}

