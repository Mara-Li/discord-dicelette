import { ActionRowBuilder, ButtonInteraction, Locale, ModalActionRowComponentBuilder,ModalBuilder, ModalSubmitInteraction, PermissionsBitField, TextInputBuilder, TextInputStyle, User } from "discord.js";
import { TFunction } from "i18next";
import removeAccents from "remove-accents";

import { StatisticalTemplate } from "../../interface";
import { ln } from "../../localizations";
import { getTemplateWithDB } from "../../utils/db";
import { parseEmbed } from "../../utils/parse_embeds";
import { embedStatistiques, showStatistiqueModal } from "../stats/add";
import { createEmbedFirstPage } from "./validate";



export async function continuePage(interaction: ButtonInteraction, dbTemplate: StatisticalTemplate, ul: TFunction<"translation", undefined>, interactionUser: User) {
	const isModerator = interaction.guild?.members.cache.get(interactionUser.id)?.permissions.has(PermissionsBitField.Flags.ManageRoles);
	if (!isModerator) {
		await interaction.reply({ content: ul("modals.noPermission"), ephemeral: true });
		return;
	}
	const embed = parseEmbed(interaction);
	if (!embed) return;
	if (!dbTemplate.statistics) return;
	const allTemplateStat = Object.keys(dbTemplate.statistics);
	const statsAlreadySet = Object.keys(embed).filter(stat => allTemplateStat.includes(removeAccents(stat).replace("✏️", "").toLowerCase().trim())).map(stat => removeAccents(stat).replace("✏️", "").toLowerCase().trim());
	if (statsAlreadySet.length === allTemplateStat.length) {
		await interaction.reply({ content: ul("modals.alreadySet"), ephemeral: true });
		return;
	}
	const page = isNaN(parseInt(interaction.customId.replace("page", ""), 10)) ? 2 : parseInt(interaction.customId.replace("page", ""), 10) + 1;
	await showStatistiqueModal(interaction, dbTemplate, statsAlreadySet, page);
}export async function pageNumber(interaction: ModalSubmitInteraction, ul: TFunction<"translation", undefined>) {
	const pageNumber = parseInt(interaction.customId.replace("page", ""), 10);
	if (isNaN(pageNumber)) return;
	const template = await getTemplateWithDB(interaction);
	if (!template) {
		await interaction.reply({ content: ul("error.noTemplate") });
		return;
	}
	await embedStatistiques(interaction, template, pageNumber);
}
export async function firstPage(interaction: ModalSubmitInteraction) {
	if (!interaction.guild || !interaction.channel || interaction.channel.isDMBased()) return;
	const template = await getTemplateWithDB(interaction);
	if (!template) return;
	await createEmbedFirstPage(interaction, template);
}
export async function showFirstPageModal(interaction: ButtonInteraction, template: StatisticalTemplate) {
	let nbOfPages = 1;
	if (template.statistics) {
		const nbOfStatistique = Object.keys(template.statistics).length;
		nbOfPages = Math.floor(nbOfStatistique / 5) > 0 ? Math.floor(nbOfStatistique / 5) : 2;
	}

	const ul = ln(interaction.locale as Locale);
	const modal = new ModalBuilder()
		.setCustomId("firstPage")
		.setTitle(ul("modals.firstPage", { page: nbOfPages + 1 }));
	const charNameInput = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
		new TextInputBuilder()
			.setCustomId("charName")
			.setLabel(ul("modals.charName.name"))
			.setPlaceholder(ul("modals.charName.description"))
			.setRequired(template.charName || false)
			.setValue("")
			.setStyle(TextInputStyle.Short)
	);
	const userIdInputs = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
		new TextInputBuilder()
			.setCustomId("userID")
			.setLabel(ul("modals.user.name"))
			.setPlaceholder(ul("modals.user.description"))
			.setRequired(true)
			.setValue(interaction.user.username ?? interaction.user.id)
			.setStyle(TextInputStyle.Short)
	);
	modal.addComponents(charNameInput, userIdInputs);
	await interaction.showModal(modal);
}
export async function register_user(interaction: ButtonInteraction, template: StatisticalTemplate, interactionUser: User, ul: TFunction<"translation", undefined>) {
	const isModerator = interaction.guild?.members.cache.get(interactionUser.id)?.permissions.has(PermissionsBitField.Flags.ManageRoles);
	if (isModerator)
		await showFirstPageModal(interaction, template);


	else
		await interaction.reply({ content: ul("modals.noPermission"), ephemeral: true });
}

