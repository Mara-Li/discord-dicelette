import { ActionRowBuilder, ButtonInteraction, Locale, ModalActionRowComponentBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";

import { StatisticalTemplate } from "../interface";
import { ln } from "../localizations";

export async function showFirstPageModal(interaction: ButtonInteraction, template: StatisticalTemplate) {
	let nbOfPages = 1;
	if (template.statistics) {
		const nbOfStatistique = Object.keys(template.statistics).length;
		nbOfPages = Math.floor(nbOfStatistique / 5) > 0 ? Math.floor(nbOfStatistique / 5) : 2;
	}

	const ul = ln(interaction.locale as Locale);
	const modal = new ModalBuilder()
		.setCustomId("firstPage")
		.setTitle(ul("modals.firstPage", {page: nbOfPages + 1}));
	const charNameInput = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
		new TextInputBuilder()
			.setCustomId("charName")
			.setLabel(ul("modals.charName.name"))
			.setPlaceholder(ul("modals.charName.description"))
			.setRequired(template.charName || false)
			.setValue("")
			.setStyle(TextInputStyle.Short),
	);
	const userIdInputs = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
		new TextInputBuilder()
			.setCustomId("userID")
			.setLabel(ul("modals.user.name"))
			.setPlaceholder(ul("modals.user.description"))
			.setRequired(true)
			.setValue(interaction.user.username ?? interaction.user.id)
			.setStyle(TextInputStyle.Short),
	);
	modal.addComponents(charNameInput, userIdInputs);	
	await interaction.showModal(modal);
}

export async function showStatistiqueModal(interaction: ButtonInteraction, template: StatisticalTemplate, stats?: string[], page = 1) {
	if (!template.statistics) return;
	const ul = ln(interaction.locale as Locale);
	const statsWithoutCombinaison = Object.keys(template.statistics).filter(stat => !template.statistics![stat].combinaison) ?? [];
	const nbOfPages = Math.ceil(statsWithoutCombinaison.length / 5) >= 1 ? Math.ceil(statsWithoutCombinaison.length / 5) : page;
	const modal = new ModalBuilder()
		.setCustomId(`page${page}`)
		.setTitle(ul("modals.steps", {page, max: nbOfPages + 1 }));
	let statToDisplay = Object.keys(template.statistics);
	
	if (stats && stats.length > 0) {
		statToDisplay = statToDisplay.filter(stat => !stats.includes(stat));
		if (statToDisplay.length === 0) {
			await interaction.reply({ content: ul("modals.alreadySet"), ephemeral: true });
			return;
		}
	}
	//take 5 stats
	const statsToDisplay = statToDisplay.slice(0, 4);
	for (const stat of statsToDisplay) {
		const value = template.statistics[stat];
		if (value.combinaison) continue;
		let msg = "";
		if (value.min && value.max) 
			msg = ul("modals.enterValue.minAndMax", {min: value.min, max: value.max});
		else if (value.min) msg = ul("modals.enterValue.minOnly", {min: value.min});
		else if (value.max) msg = ul("modals.enterValue.maxOnly", {max: value.max});
		const input = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
			new TextInputBuilder()
				.setCustomId(stat)
				.setLabel(stat)
				.setPlaceholder(msg)
				.setRequired(true)
				.setValue("")
				.setStyle(TextInputStyle.Short),
		);
		modal.addComponents(input);
	}
	await interaction.showModal(modal);
}

export async function showDamageDiceModals(interaction: ButtonInteraction, first?: boolean) {
	const ul = ln(interaction.locale as Locale);
	const id = first ? "damageDice_first" : "damageDice";
	const modal = new ModalBuilder()
		.setCustomId(id)
		.setTitle(ul("register.embed.damage"));
	const damageDice = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
		new TextInputBuilder()
			.setCustomId("damageName")
			.setLabel("Name")
			.setPlaceholder(ul("modals.enterValue.minAndMax", {min: 1, max: 100}))
			.setRequired(true)
			.setValue("")
			.setStyle(TextInputStyle.Short),	
	);
	const diceValue = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
		new TextInputBuilder()
			.setCustomId("damageValue")
			.setLabel("Value")
			.setPlaceholder("1d5")
			.setRequired(true)
			.setValue("")
			.setStyle(TextInputStyle.Short),	
	);
	modal.addComponents(damageDice);
	modal.addComponents(diceValue);
	await interaction.showModal(modal);
}