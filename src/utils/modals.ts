import { ActionRowBuilder, ButtonInteraction, Locale, ModalActionRowComponentBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";

import { StatisticalTemplate } from "../interface";
import { ln } from "../localizations";

export async function showFistPageModal(interaction: ButtonInteraction, template: StatisticalTemplate) {
	const nbOfStatistique = Object.keys(template.statistics).length;
	const nbOfPages = Math.floor(nbOfStatistique / 5) > 0 ? Math.floor(nbOfStatistique / 5) : 2;
	const ul = ln(interaction.locale as Locale);
	const modal = new ModalBuilder()
		.setCustomId("firstPage")
		.setTitle(ul.modals.firstPage(nbOfPages));
	const charNameInput = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
		new TextInputBuilder()
			.setCustomId("charName")
			.setLabel(ul.modals.charName.name)
			.setPlaceholder(ul.modals.charName.description)
			.setRequired(template.charName || false)
			.setValue("")
			.setStyle(TextInputStyle.Short),
	);
	const userIdInputs = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
		new TextInputBuilder()
			.setCustomId("userID")
			.setLabel(ul.modals.user.name)
			.setPlaceholder(ul.modals.user.description)
			.setRequired(true)
			.setValue("")
			.setStyle(TextInputStyle.Short),
	);
	modal.addComponents(charNameInput, userIdInputs);	
	await interaction.showModal(modal);
}

export async function showStatistiqueModal(interaction: ButtonInteraction, template: StatisticalTemplate, stats?: string[], page = 1) {
	const ul = ln(interaction.locale as Locale);
	const statsWithoutCombinaison = Object.keys(template.statistics).filter(stat => !template.statistics[stat].combinaison) ?? [];
	const nbOfPages = Math.ceil(statsWithoutCombinaison.length / 5) >= 1 ? Math.ceil(statsWithoutCombinaison.length / 5) : page;
	const modal = new ModalBuilder()
		.setCustomId(`page${page}`)
		.setTitle(ul.modals.steps(page, nbOfPages +1 ));
	let statToDisplay = Object.keys(template.statistics);
	if (stats && stats.length > 0) {
		statToDisplay = statToDisplay.filter(stat => !stats.includes(stat));
		if (statToDisplay.length === 0) {
			await interaction.reply({ content: ul.modals.alreadySet, ephemeral: true });
			return;
		}
	}
	//take 5 stats
	const statsToDisplay = statToDisplay.slice(0, 4);
	for (const stat of statsToDisplay) {
		const value = template.statistics[stat];
		if (value.combinaison) continue;
		const input = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
			new TextInputBuilder()
				.setCustomId(stat)
				.setLabel(stat)
				.setPlaceholder(ul.modals.enterValue(value.min, value.max))
				.setRequired(true)
				.setValue("")
				.setStyle(TextInputStyle.Short),
		);
		modal.addComponents(input);
	}
	await interaction.showModal(modal);
}