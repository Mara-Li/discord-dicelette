import { ActionRowBuilder, ButtonInteraction, Embed, ModalActionRowComponentBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import { TFunction } from "i18next";

import { isArrayEqual, title } from "..";
import { getGuildData } from "../db";
import { getEmbeds, parseEmbedFields } from "../embeds/parse";

export async function showEditorStats(interaction: ButtonInteraction, ul: TFunction<"translation", undefined>) {
	const statistics = getEmbeds(ul, interaction.message, "stats");
	if (!statistics) return;
	const stats = parseEmbedFields(statistics.toJSON() as Embed);
	const registeredStats = getGuildData(interaction)?.templateID.statsName;
	const userStats = Object.keys(stats).map(stat => stat.toLowerCase());
	let statsStrings = "";
	for (const [name, value] of Object.entries(stats)) {
		let stringValue = value;
		if (value.match(/`(.*)`/)) {
			const combinaison = value.match(/`(.*)`/)?.[1];
			if (combinaison) stringValue = combinaison;
		}
		statsStrings += `- ${name}: ${stringValue}\n`;
	}
	if (!isArrayEqual(registeredStats, userStats) && registeredStats && registeredStats.length > userStats.length) {
		//check which stats was added
		const diff = registeredStats.filter(x => !userStats.includes(x));
		for (const stat of diff) {
			statsStrings += `- ${stat}: 0\n`;
		}
	}

	const modal = new ModalBuilder()
		.setCustomId("editStats")
		.setTitle(title(ul("common.statistic")));
	const input = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
		new TextInputBuilder()
			.setCustomId("allStats")
			.setLabel(ul("modals.editStats"))
			.setRequired(true)
			.setStyle(TextInputStyle.Paragraph)
			.setValue(statsStrings),
	);
	modal.addComponents(input);
	await interaction.showModal(modal);
}