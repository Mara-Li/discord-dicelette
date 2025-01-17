import type { StatisticalTemplate } from "@dicelette/core";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createTemplateEmbed } from "@interactions";
import type { PersonnageIds } from "@interfaces/database";
import type { Settings, Translation } from "@interfaces/discord";
import { findln } from "@localization";
import { logger } from "@logger";
import { NoEmbed, searchUserChannel } from "@utils";
import * as Djs from "discord.js";
/**
 * Ensure the embeds are present
 * @param {Message} message
 */
export function ensureEmbed(message?: Djs.Message) {
	const oldEmbeds = message?.embeds[0];
	if (!oldEmbeds || !oldEmbeds?.fields) throw new NoEmbed();
	return oldEmbeds;
}

/**
 * Create a list of embeds
 */
export function createEmbedsList(
	userDataEmbed: Djs.EmbedBuilder,
	statsEmbed?: Djs.EmbedBuilder,
	diceEmbed?: Djs.EmbedBuilder,
	templateEmbed?: Djs.EmbedBuilder
) {
	const allEmbeds = [userDataEmbed];
	if (statsEmbed) allEmbeds.push(statsEmbed);
	if (diceEmbed) allEmbeds.push(diceEmbed);
	if (templateEmbed) allEmbeds.push(templateEmbed);
	return allEmbeds;
}

/**
 * Get the embeds from the message and replace based on the embed to replace
 * Also it returns if the embeds exists or not (useful for the buttons)
 */
export function getEmbedsList(
	ul: Translation,
	embedToReplace: {
		which: "user" | "stats" | "damage" | "template";
		embed: Djs.EmbedBuilder;
	},
	message?: Djs.Message
) {
	const userDataEmbed =
		embedToReplace.which === "user"
			? embedToReplace.embed
			: getEmbeds(ul, message, "user");
	if (!userDataEmbed) throw new NoEmbed();
	const statsEmbed =
		embedToReplace.which === "stats"
			? embedToReplace.embed
			: getEmbeds(ul, message, "stats");
	const diceEmbed =
		embedToReplace.which === "damage"
			? embedToReplace.embed
			: getEmbeds(ul, message, "damage");
	const templateEmbed =
		embedToReplace.which === "template"
			? embedToReplace.embed
			: getEmbeds(ul, message, "template");
	return {
		list: createEmbedsList(userDataEmbed, statsEmbed, diceEmbed, templateEmbed),
		exists: {
			user: !!userDataEmbed,
			stats: !!statsEmbed,
			damage: !!diceEmbed,
			template: !!templateEmbed,
		},
	};
}

/**
 * Remove the embeds from the list
 */
export function removeEmbedsFromList(
	embeds: Djs.EmbedBuilder[],
	which: "user" | "stats" | "damage" | "template"
) {
	return embeds.filter((embed) => {
		const embedTitle = embed.toJSON().title;
		if (!embedTitle) return false;
		const title = findln(embedTitle);
		if (which === "user")
			return title !== "embed.user" && title !== "embed.add" && title !== "embed.old";
		if (which === "stats")
			return title !== "common.statistic" && title !== "common.statistics";
		if (which === "damage") return title !== "embed.dice";
		if (which === "template") return title !== "embed.template";
	});
}

/**
 * Parse the embed fields and remove the backtick if any
 */
export function parseEmbedFields(embed: Djs.Embed): { [name: string]: string } {
	const fields = embed.fields;
	if (!fields) return {};
	const parsedFields: { [name: string]: string } = {};
	for (const field of fields) {
		parsedFields[findln(field.name.removeBacktick())] = findln(
			field.value.removeBacktick()
		);
	}
	return parsedFields;
}

/**
 * Get the embeds from the message and recreate it as EmbedBuilder
 */
export function getEmbeds(
	ul: Translation,
	message?: Djs.Message,
	which?: "user" | "stats" | "damage" | "template"
) {
	const allEmbeds = message?.embeds;
	if (!allEmbeds) throw new Error(ul("error.noEmbed"));
	for (const embed of allEmbeds) {
		const embedJSON = embed.toJSON();
		const titleKey = findln(embed.title ?? "");
		const userKeys = ["embed.user", "embed.add", "embed.old"];
		const statsKeys = ["common.statistic", "common.statistics"];
		if (userKeys.includes(titleKey) && which === "user")
			return new Djs.EmbedBuilder(embedJSON);
		if (statsKeys.includes(titleKey) && which === "stats")
			return new Djs.EmbedBuilder(embedJSON);
		if (titleKey === "embed.dice" && which === "damage")
			return new Djs.EmbedBuilder(embedJSON);
		if (titleKey === "embed.template" && which === "template")
			return new Djs.EmbedBuilder(embedJSON);
	}
}

/**
 * Update the template of existing user when the template is edited by moderation
 * @param guildData {GuildData}
 * @param interaction {Djs.CommandInteraction}
 * @param ul {Translation}
 * @param template {StatisticalTemplate}
 */
export async function bulkEditTemplateUser(
	guildData: Settings,
	interaction: Djs.CommandInteraction,
	ul: Translation,
	template: StatisticalTemplate
) {
	const users = guildData.get(interaction.guild!.id, "user");

	for (const userID in users) {
		for (const char of users[userID]) {
			const sheetLocation: PersonnageIds = {
				channelId: char.messageId[1],
				messageId: char.messageId[0],
			};
			const thread = await searchUserChannel(
				guildData,
				interaction,
				ul,
				sheetLocation.channelId
			);
			if (!thread) continue;
			try {
				const userMessages = await thread.messages.fetch(sheetLocation.messageId);
				const templateEmbed = getEmbeds(ul, userMessages, "template");
				if (!templateEmbed) continue;
				const newEmbed = createTemplateEmbed(ul);
				if (template.diceType)
					newEmbed.addFields({
						name: ul("common.dice"),
						value: `\`${template.diceType}\``,
						inline: true,
					});
				if (template.critical?.success)
					newEmbed.addFields({
						name: ul("roll.critical.success"),
						value: `\`${template.critical.success}\``,
						inline: true,
					});
				if (template.critical?.failure)
					newEmbed.addFields({
						name: ul("roll.critical.failure"),
						value: `\`${template.critical.failure}\``,
						inline: true,
					});
				const listEmbed = getEmbedsList(
					ul,
					{ which: "template", embed: newEmbed },
					userMessages
				);
				await userMessages.edit({ embeds: listEmbed.list });
			} catch {
				//pass
			}
		}
	}
}

/**
 * Delete all characters from the guild
 * @param guildData {Settings}
 * @param interaction {Djs.CommandInteraction}
 * @param ul {Translation}
 */
export async function bulkDeleteCharacters(
	guildData: Settings,
	interaction: Djs.CommandInteraction,
	ul: Translation
) {
	//first add a warning using buttons
	const msg = ul("register.delete.confirm");
	const embed = new Djs.EmbedBuilder()
		.setTitle(ul("deleteChar.confirm.title"))
		.setDescription(msg)
		.setColor(Djs.Colors.Red);
	const confirm = new Djs.ButtonBuilder()
		.setCustomId("delete_all_confirm")
		.setStyle(Djs.ButtonStyle.Danger)
		.setLabel(ul("common.confirm"));
	const cancel = new Djs.ButtonBuilder()
		.setCustomId("delete_all_cancel")
		.setStyle(Djs.ButtonStyle.Secondary)
		.setLabel(ul("common.cancel"));
	const row = new Djs.ActionRowBuilder<Djs.ButtonBuilder>().addComponents(
		confirm,
		cancel
	);
	const channel = interaction.channel as Djs.TextChannel;
	const rep = await channel.send({ embeds: [embed], components: [row] });
	const collectorFilter = (i: { user: { id: string | undefined } }) =>
		i.user.id === interaction.user.id;
	try {
		const confirm = await rep.awaitMessageComponent({
			filter: collectorFilter,
			time: 60_000,
		});
		console.log(confirm);
		if (confirm.customId === "delete_all_confirm") {
			guildData.delete(interaction.guild!.id, "user");
			await rep.edit({
				components: [],
				content: ul("register.delete.done"),
				embeds: [],
			});
		} else {
			await rep.edit({ components: [] });
		}
	} catch (err) {
		logger.error(err);
	}
	return;
}

/**
 * Get the statistiques fields from the modals and verify if all value are correct and if the total is not exceeded
 */
export function getStatistiqueFields(
	interaction: Djs.ModalSubmitInteraction,
	templateData: StatisticalTemplate,
	ul: Translation
) {
	const combinaisonFields: { [name: string]: string } = {};
	const stats: { [name: string]: number } = {};
	let total = templateData.total;
	if (!templateData.statistics) return { combinaisonFields, stats };
	for (const [key, value] of Object.entries(templateData.statistics)) {
		const name = key.standardize();
		if (!interaction.fields.fields.has(name) && !value.combinaison) continue;
		if (value.combinaison) {
			combinaisonFields[key] = value.combinaison;
			continue;
		}
		const statValue = interaction.fields.getTextInputValue(name);
		if (!statValue) continue;
		const num = Number.parseInt(statValue, 10);
		if (value.min && num < value.min)
			throw new Error(ul("error.mustBeGreater", { value: name, min: value.min }));
		if (value.max && num > value.max)
			throw new Error(ul("error.mustBeLower", { value: name, max: value.max }));
		if (total) {
			total -= num;
			if (total < 0) {
				const exceeded = total * -1;
				throw new Error(ul("error.totalExceededBy", { value: name, max: exceeded }));
			}
			stats[key] = num;
		} else stats[key] = num;
	}
	return { combinaisonFields, stats };
}
