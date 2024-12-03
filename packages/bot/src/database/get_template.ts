import {
	type StatisticalTemplate,
	templateSchema,
	verifyTemplateValue,
} from "@dicelette/core";
import { ln } from "@dicelette/localization";
import type { Settings } from "@dicelette/types";
import * as Djs from "discord.js";

/**
 * Get the statistical Template using the database templateID information
 */
export async function getTemplateWithDB(
	interaction:
		| Djs.ButtonInteraction
		| Djs.ModalSubmitInteraction
		| Djs.CommandInteraction,
	enmap: Settings
) {
	if (!interaction.guild) return;
	const guild = interaction.guild;
	const templateID = enmap.get(interaction.guild.id, "templateID");
	const ul = ln(interaction.locale);
	if (!enmap.has(interaction.guild.id) || !templateID)
		throw new Error(ul("error.noGuildData", { server: interaction.guild.name }));

	const { channelId, messageId } = templateID;
	const channel = await guild.channels.fetch(channelId);
	if (!channel || channel instanceof Djs.CategoryChannel) return;
	try {
		const message = await channel.messages.fetch(messageId);
		const template = message.attachments.first();
		if (!template) {
			// noinspection ExceptionCaughtLocallyJS
			throw new Error(ul("error.noTemplate"));
		}
		const res = await fetch(template.url).then((res) => res.json());
		if (!enmap.get(guild.id, "templateID.valid")) {
			enmap.set(guild.id, true, "templateID.valid");
			return verifyTemplateValue(template);
		}
		const parsedTemplate = templateSchema.parse(template);
		return parsedTemplate as StatisticalTemplate;
	} catch (error) {
		if ((error as Error).message === "Unknown Message")
			throw new Error(ul("error.noTemplateId", { channelId, messageId }));
		throw error;
	}
}
