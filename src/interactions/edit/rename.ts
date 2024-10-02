import { rename } from "@commands/gimmick/edit";
import { allowEdit } from "@interactions";
import type { PersonnageIds, UserMessageId } from "@interfaces/database";
import { findln } from "@localization";
import type { EClient } from "@main";
import { getUserByEmbed } from "@utils/db";
import { getEmbeds } from "@utils/parse";
import * as Djs from "discord.js";
import type { DiscordChannel, Settings, Translation } from "@interfaces/discord";
export async function initiateRenaming(
	interaction: Djs.StringSelectMenuInteraction,
	ul: Translation,
	interactionUser: Djs.User,
	db: Settings
) {
	if (await allowEdit(interaction, db, interactionUser))
		await showRename(interaction, ul);
}

export async function showRename(
	interaction: Djs.StringSelectMenuInteraction,
	ul: Translation
) {
	const modal = new Djs.ModalBuilder()
		.setCustomId("rename")
		.setTitle(ul("button.edit.name"));
	const input =
		new Djs.ActionRowBuilder<Djs.ModalActionRowComponentBuilder>().addComponents(
			new Djs.TextInputBuilder()
				.setCustomId("newName")
				.setLabel(ul("common.character"))
				.setRequired(true)
				.setStyle(Djs.TextInputStyle.Short)
		);
	modal.addComponents(input);
	await interaction.showModal(modal);
}

export async function validateRename(
	interaction: Djs.ModalSubmitInteraction,
	ul: Translation,
	client: EClient
) {
	if (!interaction.message) return;
	const newName = interaction.fields.getTextInputValue("newName");
	if (!newName || !interaction.channel) return;
	const embed = getEmbeds(ul, interaction.message, "user");
	if (!embed) throw new Error(ul("error.noEmbed"));
	const userId = embed
		.toJSON()
		.fields?.find((field) => findln(field.name) === "common.user")
		?.value.replace("<@", "")
		.replace(">", "");
	if (!userId) throw new Error(ul("error.user"));
	const user = interaction.client.users.cache.get(userId);
	if (!user) throw new Error(ul("error.user"));
	const sheetLocation: PersonnageIds = {
		channelId: interaction.channel.id,
		messageId: interaction.message.id,
	};
	const charData = getUserByEmbed(interaction.message, ul);
	if (!charData) throw new Error(ul("error.notFound"));
	const oldData: {
		charName?: string | null;
		messageId: UserMessageId;
		damageName?: string[];
		isPrivate?: boolean;
	} = {
		charName: charData.userName,
		messageId: [sheetLocation.messageId, sheetLocation.channelId],
		damageName: Object.keys(charData.damage ?? {}),
		isPrivate: charData.private,
	};
	const guildData = client.settings.get(interaction.guildId as string);
	if (!guildData) return;
	await rename(
		newName,
		interaction,
		ul,
		user,
		client,
		sheetLocation,
		oldData,
		interaction.channel as DiscordChannel
	);
}
