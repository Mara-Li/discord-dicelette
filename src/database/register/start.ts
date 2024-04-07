import { StatisticalTemplate } from "@dicelette/core";
import { Settings, Translation } from "@interface";
import { ln } from "@localization";
import { createEmbedFirstPage } from "@register/validate";
import { embedStatistiques, showStatistiqueModal } from "@stats/add";
import { removeEmojiAccents, reply } from "@utils";
import { getTemplateWithDB } from "@utils/db";
import { parseEmbed } from "@utils/parse";
import { ActionRowBuilder, ButtonInteraction, Locale, ModalActionRowComponentBuilder,ModalBuilder, ModalSubmitInteraction, PermissionsBitField, TextInputBuilder, TextInputStyle, User } from "discord.js";


/**
 * Interaction to continue to the next page of the statistics when registering a new user
 * @param interaction {ButtonInteraction}
 * @param dbTemplate {StatisticalTemplate}
 * @param ul {Translation}
 * @param interactionUser {User}
 * @returns 
 */
export async function continuePage(interaction: ButtonInteraction, dbTemplate: StatisticalTemplate, ul: Translation, interactionUser: User) {
	const isModerator = interaction.guild?.members.cache.get(interactionUser.id)?.permissions.has(PermissionsBitField.Flags.ManageRoles);
	if (!isModerator) {
		await reply(interaction,{ content: ul("modals.noPermission"), ephemeral: true });
		return;
	}
	const embed = parseEmbed(interaction);
	if (!embed) return;
	if (!dbTemplate.statistics) return;

	const allTemplateStat = Object.keys(dbTemplate.statistics).map(stat => removeEmojiAccents(stat));
	const statsAlreadySet = Object.keys(embed).filter(stat => allTemplateStat.includes(removeEmojiAccents(stat))).map(stat => removeEmojiAccents(stat));
	if (statsAlreadySet.length === allTemplateStat.length) {
		await reply(interaction,{ content: ul("modals.alreadySet"), ephemeral: true });
		return;
	}
	const page = isNaN(parseInt(interaction.customId.replace("page", ""), 10)) ? 2 : parseInt(interaction.customId.replace("page", ""), 10) + 1;
	await showStatistiqueModal(interaction, dbTemplate, statsAlreadySet, page);
}

/**
 * Register the statistic in the embed when registering a new user and validate the modal
 * Also verify if the template is registered before embeding the statistics
 * @param interaction {ModalSubmitInteraction}
 * @param ul {Translation}
 */
export async function pageNumber(interaction: ModalSubmitInteraction, ul: Translation, db: Settings) {
	const pageNumber = parseInt(interaction.customId.replace("page", ""), 10);
	if (isNaN(pageNumber)) return;
	const template = await getTemplateWithDB(interaction, db);
	if (!template) {
		await reply(interaction,{ content: ul("error.noTemplate") });
		return;
	}
	await embedStatistiques(interaction, template, pageNumber);
}
/**
 * Submit the first page when the modal is validated
 * @param interaction {ModalSubmitInteraction}
 */
export async function submit_firstPage(interaction: ModalSubmitInteraction, db: Settings) {
	if (!interaction.guild || !interaction.channel || interaction.channel.isDMBased()) return;
	const template = await getTemplateWithDB(interaction, db);
	if (!template) return;
	await createEmbedFirstPage(interaction, template);
}
/**
 * Modal opened to register a new user with the name of the character and the user id
 * @param interaction {ButtonInteraction}
 * @param template {StatisticalTemplate}
 */
export async function showFirstPageModal(interaction: ButtonInteraction, template: StatisticalTemplate) {
	let nbOfPages = 1;
	if (template.statistics) {
		const nbOfStatistique = Object.keys(template.statistics).length;
		nbOfPages = Math.ceil(nbOfStatistique / 5) > 0 ? Math.ceil(nbOfStatistique / 5) : 2;
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

/**
 * Open the showFirstPageModal function if the user is a moderator
 * @param interaction {ModalSubmitInteraction}
 * @param ul {Translation}
 */
export async function open_register_user(interaction: ButtonInteraction, template: StatisticalTemplate, interactionUser: User, ul: Translation) {
	const isModerator = interaction.guild?.members.cache.get(interactionUser.id)?.permissions.has(PermissionsBitField.Flags.ManageRoles);
	if (isModerator)
		await showFirstPageModal(interaction, template);
	else
		await reply(interaction,{ content: ul("modals.noPermission"), ephemeral: true });
}

