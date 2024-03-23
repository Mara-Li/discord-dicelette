import { ButtonInteraction, EmbedBuilder, ModalSubmitInteraction, ThreadChannel } from "discord.js";
import { TFunction } from "i18next";

import { getEmbeds } from "../utils/parse";

export async function getUserNameAndChar(interaction: ButtonInteraction | ModalSubmitInteraction, ul: TFunction<"translation", undefined>) {
	const userEmbed = getEmbeds(ul, interaction?.message ?? undefined, "user");
	if (!userEmbed) throw new Error(ul("error.noEmbed"));
	const userID = userEmbed.toJSON().fields?.find(field => field.name === ul("common.user"))?.value.replace("<@", "").replace(">", "");
	if (!userID) throw new Error(ul("error.user"));
	if (!interaction.channel || !(interaction.channel instanceof ThreadChannel)) throw new Error(ul("error.noThread"));
	let userName = userEmbed.toJSON().fields?.find(field => field.name === ul("common.charName"))?.value;
	if (userName === ul("common.noSet")) userName = undefined;
	return { userID, userName, thread: interaction.channel };
}

export function createDiceEmbed(ul: TFunction<"translation", undefined>) {
	return new EmbedBuilder()
		.setTitle(ul("embed.dice"))
		.setColor("Green");
}

export function createUserEmbed(ul: TFunction<"translation", undefined>, thumbnail: string) {
	return new EmbedBuilder()
		.setTitle(ul("embed.user"))
		.setColor("Random")
		.setThumbnail(thumbnail);
}

export function createStatsEmbed(ul: TFunction<"translation", undefined>) {
	return new EmbedBuilder()
		.setTitle(ul("embed.stats"))
		.setColor("Aqua");
}

export function createTemplateEmbed(ul: TFunction<"translation", undefined>) {
	return new EmbedBuilder()
		.setTitle(ul("embed.template"))
		.setColor("DarkGrey");
}