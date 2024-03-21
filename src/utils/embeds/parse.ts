/* eslint-disable @typescript-eslint/no-explicit-any */
import { ButtonInteraction, Embed, EmbedBuilder, Message, ModalSubmitInteraction } from "discord.js";
import { TFunction } from "i18next";




export function parseEmbed(interaction: ButtonInteraction | ModalSubmitInteraction) {
	const embed = interaction.message?.embeds[0];
	if (!embed) return;
	return parseEmbedFields(embed);
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
		if (embed.title === ul("modals.embedTitle") && which === "user") return new EmbedBuilder(embedJSON);
		else if (embed.title === ul("modals.statsTitle") && which === "stats") return new EmbedBuilder(embedJSON);
		else if (embed.title === ul("modals.diceTitle") && which === "damage") return new EmbedBuilder(embedJSON);
		else if (embed.title === ul("modals.template.title") && which === "template") return new EmbedBuilder(embedJSON);
	}
}



