import type { PersonnageIds, Settings, Translation } from "@interface";
import { ensureEmbed, getEmbeds } from "@utils/parse";
import {
	type ButtonInteraction,
	EmbedBuilder,
	type Locale,
	type Message,
	type ModalSubmitInteraction,
	PermissionsBitField,
	TextChannel,
	ThreadChannel,
	type User,
} from "discord.js";
import { findln, ln } from "../localizations";
import { embedError, reply, title } from "../utils";
import removeAccents from "remove-accents";
import { warn } from "../console";

/**
 * Get the userName and the char from the embed between an interaction (button or modal), throw error if not found
 * @param interaction {ButtonInteraction | ModalSubmitInteraction}
 * @param ul {Translation}
 */
export async function getUserNameAndChar(
	interaction: ButtonInteraction | ModalSubmitInteraction,
	ul: Translation,
	first?: boolean
) {
	let userEmbed = getEmbeds(ul, interaction?.message ?? undefined, "user");
	if (first) {
		const firstEmbed = ensureEmbed(interaction?.message ?? undefined);
		if (firstEmbed) userEmbed = new EmbedBuilder(firstEmbed.toJSON());
	}
	if (!userEmbed) throw new Error(ul("error.noEmbed"));
	const userID = userEmbed
		.toJSON()
		.fields?.find((field) => findln(field.name) === "common.user")
		?.value.replace("<@", "")
		.replace(">", "");
	if (!userID) throw new Error(ul("error.user"));
	if (
		!interaction.channel ||
		(!(interaction.channel instanceof ThreadChannel) &&
			!(interaction.channel instanceof TextChannel))
	)
		throw new Error(ul("error.noThread"));
	let userName = userEmbed
		.toJSON()
		.fields?.find((field) => findln(field.name) === "common.character")?.value;
	if (userName === ul("common.noSet")) userName = undefined;
	return { userID, userName, thread: interaction.channel };
}
/**
 * Create the dice skill embed
 * @param ul {Translation}
 */
export function createDiceEmbed(ul: Translation) {
	return new EmbedBuilder().setTitle(ul("embed.dice")).setColor("Green");
}

/**
 * Create the userEmbed and embedding the avatar user in the thumbnail
 * @param ul {Translation}
 * @param thumbnail {string} The avatar of the user in the server (use server profile first, after global avatar)
 */
export function createUserEmbed(
	ul: Translation,
	thumbnail: string | null,
	user: string,
	charName?: string
) {
	const userEmbed = new EmbedBuilder()
		.setTitle(ul("embed.user"))
		.setColor("Random")
		.setThumbnail(thumbnail)
		.addFields({ name: title(ul("common.user")), value: `<@${user}>`, inline: true });
	if (charName)
		userEmbed.addFields({
			name: title(ul("common.character")),
			value: title(charName),
			inline: true,
		});
	else
		userEmbed.addFields({
			name: title(ul("common.character")),
			value: title(ul("common.noSet")),
			inline: true,
		});
	return userEmbed;
}

/**
 * Create the statistic embed
 * @param ul {Translation}
 */
export function createStatsEmbed(ul: Translation) {
	return new EmbedBuilder().setTitle(title(ul("common.statistics"))).setColor("Aqua");
}

/**
 * Create the template embed for user
 * @param ul {Translation}
 */
export function createTemplateEmbed(ul: Translation) {
	return new EmbedBuilder().setTitle(ul("embed.template")).setColor("DarkGrey");
}

export function verifyIfEmbedInDB(
	db: Settings,
	message: Message,
	userId: string,
	userName?: string
): { isInDb: boolean; coord?: PersonnageIds } {
	const charData = db.get(message.guild!.id, `user.${userId}`);
	if (!charData) return { isInDb: false };
	const charName = charData.find((char) => {
		if (userName && char.charName)
			return (
				removeAccents(char.charName).toLowerCase() ===
				removeAccents(userName.toLowerCase())
			);
		return char.charName == null && userName == null;
	});
	if (!charName) return { isInDb: false };
	const ids: PersonnageIds = {
		channelId: charName.messageId[1],
		messageId: charName.messageId[0],
	};
	return {
		isInDb: message.channel.id === ids.channelId && message.id === ids.messageId,
		coord: ids,
	};
}

export async function allowEdit(
	interaction: ButtonInteraction,
	db: Settings,
	interactionUser: User
) {
	const ul = ln(interaction.locale as Locale);
	const embed = ensureEmbed(interaction.message);
	const user = embed.fields
		.find((field) => findln(field.name) === "common.user")
		?.value.replace("<@", "")
		.replace(">", "");
	const isSameUser = user === interactionUser.id;
	const isModerator = interaction.guild?.members.cache
		.get(interactionUser.id)
		?.permissions.has(PermissionsBitField.Flags.ManageRoles);
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
				warn("Error while deleting message", e, "allowEdit");
			}
			return false;
		}
	}
	if (isSameUser || isModerator) return true;
	await reply(interaction, { content: ul("modals.noPermission"), ephemeral: true });
	return false;
}
