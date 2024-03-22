import { ActionRowBuilder, ButtonInteraction, Embed, ModalActionRowComponentBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import { TFunction } from "i18next";

import { isArrayEqual, title } from "..";
import { getGuildData } from "../db";
import { getEmbeds, parseEmbedFields } from "../embeds/parse";

export async function showEditorStats(interaction: ButtonInteraction, ul: TFunction<"translation", undefined>) {
	const statistics = getEmbeds(ul, interaction.message, "stats");
	if (!statistics) throw new Error(ul("error.statNotFound"));
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

export async function showEditTemplate(interaction: ButtonInteraction, ul: TFunction<"translation", undefined>) {
	const template = getEmbeds(ul, interaction.message, "template");
	if (!template) throw new Error(ul("error.noTemplate"));
	const templateFields = parseEmbedFields(template.toJSON() as Embed);
	const modal = new ModalBuilder()
		.setCustomId("editTemplate")
		.setTitle(title(ul("common.template")));

	for (const [name, value] of Object.entries(templateFields)) {
		const input = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
			new TextInputBuilder()
				.setCustomId(name)
				.setLabel(name)
				.setRequired(false)
				.setStyle(TextInputStyle.Short)
				.setValue(value),
		);
		modal.addComponents(input);
	}
	await interaction.showModal(modal);
}

export async function showEditDice(interaction: ButtonInteraction, ul: TFunction<"translation", undefined>) {
	const diceEmbed = getEmbeds(ul, interaction.message, "damage");
	if (!diceEmbed) throw new Error(ul("error.invalidDice.embeds"));
	const diceFields = parseEmbedFields(diceEmbed.toJSON() as Embed);
	let dices = "";
	for (const [skill, dice] of Object.keys(diceFields)) {
		dices += `- ${skill}: ${dice}\n`;
	}
	const modal = new ModalBuilder()
		.setCustomId("editDice")
		.setTitle(title(ul("common.dice")));
	const input = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
		new TextInputBuilder()
			.setCustomId("allDice")
			.setLabel(ul("modals.editStats"))
			.setRequired(true)
			.setStyle(TextInputStyle.Paragraph)
			.setValue(dices),
	);
	modal.addComponents(input);
	await interaction.showModal(modal);
}