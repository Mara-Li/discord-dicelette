import type { Translation } from "@interface";
import { ensureEmbed,getEmbeds } from "@utils/parse";
import { type ButtonInteraction, EmbedBuilder, type ModalSubmitInteraction, TextChannel, ThreadChannel } from "discord.js";

/**
 * Get the userName and the char from the embed between an interaction (button or modal), throw error if not found
 * @param interaction {ButtonInteraction | ModalSubmitInteraction}
 * @param ul {Translation}
 */
export async function getUserNameAndChar(interaction: ButtonInteraction | ModalSubmitInteraction, ul: Translation, first ?: boolean) {
	let userEmbed = getEmbeds(ul, interaction?.message ?? undefined, "user");
	if (!first){
		const firstEmbed = ensureEmbed(interaction?.message ?? undefined);
		if (firstEmbed) userEmbed = new EmbedBuilder(firstEmbed.toJSON());
	}
	if (!userEmbed) throw new Error(ul("error.noEmbed"));
	const userID = userEmbed.toJSON().fields?.find(field => field.name === ul("common.user"))?.value.replace("<@", "").replace(">", "");
	if (!userID) throw new Error(ul("error.user"));
	if (!interaction.channel || !(interaction.channel instanceof ThreadChannel) && !(interaction.channel instanceof TextChannel)) throw new Error(ul("error.noThread"));
	let userName = userEmbed.toJSON().fields?.find(field => field.name === ul("common.charName"))?.value;
	if (userName === ul("common.noSet")) userName = undefined;
	return { userID, userName, thread: interaction.channel };
}
/**
 * Create the dice skill embed
 * @param ul {Translation}
 */
export function createDiceEmbed(ul: Translation) {
	return new EmbedBuilder()
		.setTitle(ul("embed.dice"))
		.setColor("Green");
}

/**
 * Create the userEmbed and embedding the avatar user in the thumbnail
 * @param ul {Translation}
 * @param thumbnail {string} The avatar of the user in the server (use server profile first, after global avatar)
 */
export function createUserEmbed(ul: Translation, thumbnail: string | null) {
	return new EmbedBuilder()
		.setTitle(ul("embed.user"))
		.setColor("Random")
		.setThumbnail(thumbnail);
}

/**
 * Create the statistic embed 
 * @param ul {Translation}
 */
export function createStatsEmbed(ul: Translation) {
	return new EmbedBuilder()
		.setTitle(ul("embed.stats"))
		.setColor("Aqua");
}

/**
 * Create the template embed for user
 * @param ul {Translation}
 */
export function createTemplateEmbed(ul: Translation) {
	return new EmbedBuilder()
		.setTitle(ul("embed.template"))
		.setColor("DarkGrey");
}