import type * as Djs from "discord.js";
import type {Translation} from "@dicelette/types";
import type {EClient} from "client";
import {getEmbeds} from "messages/embeds";
import {findln} from "@dicelette/localization";
import type {PersonnageIds, UserMessageId} from "@dicelette:types/database";
import {getUserByEmbed} from "database/get_user";
import {rename} from "commands/tools/edit";
import type {DiscordChannel} from "@dicelette:types/discord";

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
