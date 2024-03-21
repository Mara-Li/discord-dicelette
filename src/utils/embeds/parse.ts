/* eslint-disable @typescript-eslint/no-explicit-any */
import { ButtonInteraction, Embed, EmbedBuilder, Message, ModalSubmitInteraction } from "discord.js";
import { TFunction } from "i18next";

import { title } from "..";




export function parseEmbed(interaction: ButtonInteraction | ModalSubmitInteraction) {
	const embed = interaction.message?.embeds[0];
	if (!embed) return;
	return parseEmbedFields(embed);
}

export function createEmbedsList(userDataEmbed: EmbedBuilder, statsEmbed?: EmbedBuilder, diceEmbed?: EmbedBuilder, templateEmbed?: EmbedBuilder) {
	const allEmbeds = [userDataEmbed];
	if (statsEmbed) allEmbeds.push(statsEmbed);
	if (diceEmbed) allEmbeds.push(diceEmbed);
	if (templateEmbed) allEmbeds.push(templateEmbed);
	return allEmbeds;
}

export function getEmbedsList(ul: TFunction<"translation", undefined>, embedToReplace: {which:"user" | "stats" | "damage" | "template", embed: EmbedBuilder}, message?: Message) {
	const userDataEmbed = embedToReplace.which === "user" ? embedToReplace.embed : getEmbeds(ul, message, "user");
	if (!userDataEmbed) throw new Error("[error.noEmbed]");
	const statsEmbed = embedToReplace.which === "stats" ? embedToReplace.embed : getEmbeds(ul, message, "stats");
	const diceEmbed = embedToReplace.which === "damage" ? embedToReplace.embed : getEmbeds(ul, message, "damage");
	const templateEmbed = embedToReplace.which === "template" ? embedToReplace.embed : getEmbeds(ul, message, "template");
	return createEmbedsList(userDataEmbed, statsEmbed, diceEmbed, templateEmbed);
}

export function parseEmbedFields(embed: Embed) {
	const fields = embed.fields;
	const parsedFields: {[name: string]: string} = {};
	for (const field of fields) {
		parsedFields[field.name] = field.value;
	}
	return parsedFields;
}

/**
 * Get the embeds from the message
 * @param message {Message}
 * @param which {0|1|2|3}
 * - 0 : userData
 * - 1 : statistics
 * - 2 : damage
 * - 3 : template
 * @returns 
 */
export function getEmbeds(ul: TFunction<"translation", undefined>, message?: Message, which?: "user" | "stats" | "damage" | "template") {
	const allEmbeds = message?.embeds;
	if (!allEmbeds) throw new Error("[error.noEmbed]");
	for (const embed of allEmbeds) {
		const embedJSON = embed.toJSON();
		if (embed.title === ul("embed.user") && which === "user") return new EmbedBuilder(embedJSON);
		else if (embed.title === title(ul("embed.stats")) && which === "stats") return new EmbedBuilder(embedJSON);
		else if (embed.title === ul("embed.dice") && which === "damage") return new EmbedBuilder(embedJSON);
		else if (embed.title === ul("embed.template") && which === "template") return new EmbedBuilder(embedJSON);
	}
}



