import { allowEdit } from "@interactions";
import type { Settings, Translation } from "@interface";
import { findln } from "@localization";
import { embedError, reply } from "@utils";
import { getEmbeds, getEmbedsList } from "@utils/parse";
import { verifyAvatarUrl } from "../register/validate";
import * as Djs from "discord.js";
export async function initiateAvatarEdit(
	interaction: Djs.StringSelectMenuInteraction,
	ul: Translation,
	interactionUser: Djs.User,
	db: Settings
) {
	if (await allowEdit(interaction, db, interactionUser))
		await showAvatarEdit(interaction, ul);
}

export async function showAvatarEdit(
	interaction: Djs.StringSelectMenuInteraction,
	ul: Translation
) {
	const embed = getEmbeds(ul, interaction.message, "user");
	if (!embed) throw new Error(ul("error.noEmbed"));
	const thumbnail = embed.toJSON().thumbnail?.url ?? interaction.user.displayAvatarURL();
	const modal = new Djs.ModalBuilder()
		.setCustomId("editAvatar")
		.setTitle(ul("button.avatar.description"));
	const input =
		new Djs.ActionRowBuilder<Djs.ModalActionRowComponentBuilder>().addComponents(
			new Djs.TextInputBuilder()
				.setCustomId("avatar")
				.setLabel(ul("modals.avatar.name"))
				.setRequired(true)
				.setStyle(Djs.TextInputStyle.Short)
				.setValue(thumbnail)
		);
	modal.addComponents(input);
	await interaction.showModal(modal);
}

export async function validateAvatarEdit(
	interaction: Djs.ModalSubmitInteraction,
	ul: Translation
) {
	if (!interaction.message) return;
	const avatar = interaction.fields.getTextInputValue("avatar");
	if (avatar.match(/(cdn|media)\.discordapp\.net/gi))
		return await reply(interaction, {
			embeds: [embedError(ul("error.avatar.discord"), ul)],
		});
	if (!verifyAvatarUrl(avatar))
		return await reply(interaction, { embeds: [embedError(ul("error.avatar.url"), ul)] });

	const embed = getEmbeds(ul, interaction.message, "user");
	if (!embed) throw new Error(ul("error.noEmbed"));
	embed.setThumbnail(avatar);
	const embedsList = getEmbedsList(ul, { which: "user", embed }, interaction.message);
	await interaction.message.edit({ embeds: embedsList.list });
	const user = embed
		.toJSON()
		.fields?.find((field) => findln(field.name) === "common.user")?.value;
	const charName = embed
		.toJSON()
		.fields?.find((field) => findln(field.name) === "common.character")?.value;
	const nameMention =
		!charName || findln(charName) === "common.noSet" ? user : `${user} (${charName})`;
	const msgLink = interaction.message.url;
	await reply(interaction, {
		content: ul("edit_avatar.success", { name: nameMention, link: msgLink }),
		ephemeral: true,
	});
}
