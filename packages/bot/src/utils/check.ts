import { findln, ln } from "@dicelette/localization";
import type { Settings } from "@dicelette/types";
import { logger } from "@dicelette/utils";
import { verifyIfEmbedInDB } from "database/get_user";
import * as Djs from "discord.js";
import { embedError, ensureEmbed } from "messages/embeds";
import { reply } from "messages/send";

export async function allowEdit(
	interaction: Djs.ButtonInteraction | Djs.StringSelectMenuInteraction,
	db: Settings,
	interactionUser: Djs.User
) {
	const ul = ln(interaction.locale as Djs.Locale);
	const embed = ensureEmbed(interaction.message);
	const user = embed.fields
		.find((field) => findln(field.name) === "common.user")
		?.value.replace("<@", "")
		.replace(">", "");
	const isSameUser = user === interactionUser.id;
	const isModerator = interaction.guild?.members.cache
		.get(interactionUser.id)
		?.permissions.has(Djs.PermissionsBitField.Flags.ManageRoles);
	const first = interaction.customId.includes("first");
	const userName = embed.fields.find((field) =>
		["common.character", "common.charName"].includes(findln(field.name))
	);
	const userNameValue =
		userName && findln(userName?.value) === "common.noSet" ? undefined : userName?.value;
	if (!first && user) {
		const { isInDb, coord } = verifyIfEmbedInDB(
			db,
			interaction.message,
			user,
			userNameValue
		);
		if (!isInDb) {
			const urlNew = `https://discord.com/channels/${interaction.guild!.id}/${coord?.channelId}/${coord?.messageId}`;
			await reply(interaction, {
				embeds: [embedError(ul("error.oldEmbed", { fiche: urlNew }), ul)],
				ephemeral: true,
			});
			//delete the message
			try {
				await interaction.message.delete();
			} catch (e) {
				logger.warn("Error while deleting message", e, "allowEdit");
			}
			return false;
		}
	}
	if (isSameUser || isModerator) return true;
	await reply(interaction, { content: ul("modals.noPermission"), ephemeral: true });
	return false;
}
