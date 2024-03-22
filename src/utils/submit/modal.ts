import { ModalSubmitInteraction, PermissionsBitField, User } from "discord.js";
import { TFunction } from "i18next";

import { getTemplateWithDB } from "../db";
import { createEmbedFirstPage, embedStatistiques, registerDamageDice } from "../embeds/register_embeds";
import { ensureEmbed } from "../verify_template";

export async function damageDice(interaction: ModalSubmitInteraction, ul: TFunction<"translation", undefined>, interactionUser: User) {
	const template = await getTemplateWithDB(interaction);
	if (!template) {
		await interaction.reply({ content: ul("error.noTemplate")});
		return;
	}
	const embed = ensureEmbed(interaction.message ?? undefined);
	const user = embed.fields.find(field => field.name === ul("common.user"))?.value.replace("<@", "").replace(">", "") === interactionUser.id;
	const isModerator = interaction.guild?.members.cache.get(interactionUser.id)?.permissions.has(PermissionsBitField.Flags.ManageRoles);
	if (user || isModerator)
		await registerDamageDice(interaction, interaction.customId.includes("first"));
				
}

export async function pageNumber(interaction: ModalSubmitInteraction, ul: TFunction<"translation", undefined>) {
	const pageNumber = parseInt(interaction.customId.replace("page", ""), 10);
	if (isNaN(pageNumber)) return;
	const template = await getTemplateWithDB(interaction);
	if (!template) {
		await interaction.reply({ content: ul("error.noTemplate")});
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