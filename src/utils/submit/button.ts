import { ButtonInteraction, PermissionsBitField,User } from "discord.js";
import { TFunction } from "i18next";
import removeAccents from "remove-accents";

import { StatisticalTemplate } from "../../interface";
import { parseEmbed } from "../embeds/parse";
import { validateUser } from "../embeds/register_embeds";
import { showEditDice, showEditorStats } from "../modals/edit_modals";
import { showDamageDiceModals,showFirstPageModal,showStatistiqueModal } from "../modals/register_modals";
import { ensureEmbed } from "../verify_template";

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
	const page = isNaN(parseInt(interaction.customId.replace("page", ""), 10)) ? 2 : parseInt(interaction.customId.replace("page", ""), 10)+1;
	await showStatistiqueModal(interaction, dbTemplate, statsAlreadySet, page);
}

export async function add_dice(interaction: ButtonInteraction, ul: TFunction<"translation", undefined>, interactionUser: User
) {
	const embed = ensureEmbed(interaction.message);
	const user = embed.fields.find(field => field.name === ul("common.user"))?.value.replace("<@", "").replace(">", "") === interactionUser.id;
	const isModerator = interaction.guild?.members.cache.get(interactionUser.id)?.permissions.has(PermissionsBitField.Flags.ManageRoles);
	if (user || isModerator)
		showDamageDiceModals(interaction, interaction.customId.includes("first"));
	else 
		await interaction.reply({ content: ul("modals.noPermission"), ephemeral: true });
}

export async function edit_stats(interaction: ButtonInteraction, ul: TFunction<"translation", undefined>, interactionUser: User) {
	const embed = ensureEmbed(interaction.message);
	const user = embed.fields.find(field => field.name === ul("common.user"))?.value.replace("<@", "").replace(">", "") === interactionUser.id;
	const isModerator = interaction.guild?.members.cache.get(interactionUser.id)?.permissions.has(PermissionsBitField.Flags.ManageRoles);
	if (user || isModerator)
		showEditorStats(interaction, ul);
	else await interaction.reply({ content: ul("modals.noPermission"), ephemeral: true });
}

export async function cancel(interaction: ButtonInteraction, ul: TFunction<"translation", undefined>, interactionUser: User) {
	const embed = ensureEmbed(interaction.message);
	const user = embed.fields.find(field => field.name === ul("common.user"))?.value.replace("<@", "").replace(">", "") === interactionUser.id;
	const isModerator = interaction.guild?.members.cache.get(interactionUser.id)?.permissions.has(PermissionsBitField.Flags.ManageRoles);
	if (user || isModerator)
		await interaction.message.edit({ components: [] });
	else await interaction.reply({ content: ul("modals.noPermission"), ephemeral: true });
}

export async function edit_dice(interaction: ButtonInteraction, ul: TFunction<"translation", undefined>, interactionUser: User) {
	const embed = ensureEmbed(interaction.message);
	const user = embed.fields.find(field => field.name === ul("common.user"))?.value.replace("<@", "").replace(">", "") === interactionUser.id;
	const isModerator = interaction.guild?.members.cache.get(interactionUser.id)?.permissions.has(PermissionsBitField.Flags.ManageRoles);
	if (user || isModerator)
		await showEditDice(interaction, ul);
	else await interaction.reply({ content: ul("modals.noPermission"), ephemeral: true });
}

export async function validate_user(interaction: ButtonInteraction, interactionUser: User, template: StatisticalTemplate, ul: TFunction<"translation", undefined>) {
	const isModerator = interaction.guild?.members.cache.get(interactionUser.id)?.permissions.has(PermissionsBitField.Flags.ManageRoles);
	if (isModerator)
		await validateUser(interaction, template);
	else
		await interaction.reply({ content: ul("modals.noPermission"), ephemeral: true });
}

export async function register_user(interaction: ButtonInteraction, template: StatisticalTemplate, interactionUser: User, ul: TFunction<"translation", undefined>) {
	const isModerator = interaction.guild?.members.cache.get(interactionUser.id)?.permissions.has(PermissionsBitField.Flags.ManageRoles);
	if (isModerator)
		await showFirstPageModal(interaction, template);
	else
		await interaction.reply({ content: ul("modals.noPermission"), ephemeral: true });
}