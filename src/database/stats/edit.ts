import { ActionRowBuilder, APIEmbedField, ButtonInteraction, Embed,ModalActionRowComponentBuilder,ModalBuilder,ModalSubmitInteraction, PermissionsBitField, TextInputBuilder, TextInputStyle, User } from "discord.js";
import { TFunction } from "i18next";

import {isArrayEqual, removeEmojiAccents, title } from "../../utils";
import { editUserButtons } from "../../utils/buttons";
import { getGuildData, getTemplateWithDB } from "../../utils/db";
import { getEmbeds, getEmbedsList, parseEmbedFields, removeEmbedsFromList } from "../../utils/parse";
import { ensureEmbed, evalOneCombinaison } from "../../utils/verify_template";
import { createStatsEmbed } from "..";

/**
 * Validate the stats and edit the embed with the new stats for editing
 * @param interaction {ModalSubmitInteraction}
 * @param ul {TFunction<"translation", undefined>}
 */
export async function editStats(interaction: ModalSubmitInteraction, ul: TFunction<"translation", undefined>) {
	if (!interaction.message) return;
	const statsEmbeds = getEmbeds(ul, interaction?.message ?? undefined, "stats");
	if (!statsEmbeds) return;
	const values  = interaction.fields.getTextInputValue("allStats");
	const templateStats = await getTemplateWithDB(interaction);
	if (!templateStats) return;
	const valuesAsStats = values.split("\n- ").map(stat => {
		const [name, value] = stat.split(/ ?: ?/);
		return { name: name.replace("- ", "").trim().toLowerCase(), value };
	});
	//fusion all stats into an object instead of list
	const stats = valuesAsStats.reduce((acc, { name, value }) => {
		acc[name] = value;
		return acc;
	}, {} as {[name: string]: string});
	//verify value from template
	const embedsStatsFields: APIEmbedField[] = [];
	for (const [name, value] of Object.entries(stats)) {
		const stat = templateStats.statistics?.[removeEmojiAccents(name)];
		if (value.toLowerCase() === "x" 
			|| value.trim().length === 0 
			|| embedsStatsFields.find(field => removeEmojiAccents(field.name) === removeEmojiAccents(name))
		) continue;
		if (!stat) {
			throw new Error(ul("error.statNotFound", {value: name}));
		}
		const num = parseInt(value, 10);
		if (isNaN(num)) {
			//it's a combinaison OR an error
			//we need to get the result of the combinaison
			const combinaison = parseInt(evalOneCombinaison(value, stats), 10);
			if (isNaN(combinaison)) {
				throw new Error(`[error.invalidFormula] ${value}`);
			}
			embedsStatsFields.push({
				name: title(name),
				value: `\`${value}\` = ${combinaison}`,
				inline: true
			});
			continue;
		}
		else if (stat.min && num < stat.min) {
			throw new Error(ul("error.mustBeGreater", {value: name, min: stat.min}));
		} else if (stat.max && num > stat.max) {
			throw new Error(ul("error.mustBeLower", {value: name, max: stat.max}));
		} //skip register total because it can be a level up. Total is just for the registering, like creating a new char in a game
		embedsStatsFields.push({
			name: title(name),
			value: num.toString(),
			inline: true
		});
	}
	//verify if stats are all set from the old embed
	const oldStats = statsEmbeds.toJSON().fields;
	if (oldStats) {
		for (const field of oldStats) {
			const name = field.name.toLowerCase();
			if (
				field.value !== "0" 
				&& field.value !== "X" 
				&& field.value.trim().length > 0 
				&& embedsStatsFields.find(field => removeEmojiAccents(field.name) === removeEmojiAccents(name))
			){
				//register the old value
				embedsStatsFields.push({
					name: title(name),
					value: field.value,
					inline: true
				});
			}
		}
	}
	//remove duplicate
	const fieldsToAppend: APIEmbedField[] = [];
	for (const field of embedsStatsFields) {
		const name = field.name.toLowerCase();
		if (fieldsToAppend.find(f => removeEmojiAccents(f.name) === removeEmojiAccents(name))) continue;
		fieldsToAppend.push(field);
	}

	const newEmbedStats = createStatsEmbed(ul)
		.addFields(fieldsToAppend);
	
	if (!fieldsToAppend || fieldsToAppend.length === 0) {
		//stats was removed
		const {list, exists} = getEmbedsList(ul, {which: "stats", embed: newEmbedStats}, interaction.message);
		const toAdd = removeEmbedsFromList(list, "stats", ul);
		const components = editUserButtons(ul, false, exists.damage);
		await interaction.message.edit({ embeds: toAdd, components: [components] });
		await interaction.reply({ content: ul("modals.removed.stats"), ephemeral: true });
	}
	//get the other embeds
	const {list} = getEmbedsList(ul, {which: "stats", embed: newEmbedStats}, interaction.message);
	await interaction.message.edit({ embeds: list });
	await interaction.reply({ content: ul("embeds.edit.stats"), ephemeral: true });
}

/**
 * Show the stats editor
 * @param interaction {ButtonInteraction}
 * @param ul {TFunction<"translation", undefined>}
 */
export async function showEditorStats(interaction: ButtonInteraction, ul: TFunction<"translation", undefined>) {
	const statistics = getEmbeds(ul, interaction.message, "stats");
	if (!statistics) throw new Error(ul("error.statNotFound"));
	const stats = parseEmbedFields(statistics.toJSON() as Embed);
	const originalGuildData = getGuildData(interaction)?.templateID.statsName;
	const registeredStats = originalGuildData?.map(stat => removeEmojiAccents(stat));
	const userStats = Object.keys(stats).map(stat => removeEmojiAccents(stat.toLowerCase()));
	let statsStrings = "";
	for (const [name, value] of Object.entries(stats)) {
		let stringValue = value;
		if (!registeredStats?.includes(removeEmojiAccents(name))) continue; //remove stats that are not registered
		if (value.match(/`(.*)`/)) {
			const combinaison = value.match(/`(.*)`/)?.[1];
			if (combinaison) stringValue = combinaison;
		}
		statsStrings += `- ${name}${ul("common.space")}: ${stringValue}\n`;
	}
	if (!isArrayEqual(registeredStats, userStats) && registeredStats && registeredStats.length > userStats.length) {
		//check which stats was added
		const diff = registeredStats.filter(x => !userStats.includes(x));
		for (const stat of diff) {
			const realName = originalGuildData?.find(x => removeEmojiAccents(x) === removeEmojiAccents(stat));
			statsStrings += `- ${title(realName)}${ul("common.space")}: 0\n`;
		}
	}

	const modal = new ModalBuilder()
		.setCustomId("editStats")
		.setTitle(title(ul("common.statistic")));
	const input = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
		new TextInputBuilder()
			.setCustomId("allStats")
			.setLabel(ul("modals.edit.stats"))
			.setRequired(true)
			.setStyle(TextInputStyle.Paragraph)
			.setValue(statsStrings),
	);
	modal.addComponents(input);
	await interaction.showModal(modal);
}


/**
 * The button that trigger the stats editor
 * @param interaction {ButtonInteraction}
 * @param ul {TFunction<"translation", undefined>}
 * @param interactionUser {User}
 */
export async function start_edit_stats(interaction: ButtonInteraction, ul: TFunction<"translation", undefined>, interactionUser: User) {
	const embed = ensureEmbed(interaction.message);
	const user = embed.fields.find(field => field.name === ul("common.user"))?.value.replace("<@", "").replace(">", "") === interactionUser.id;
	const isModerator = interaction.guild?.members.cache.get(interactionUser.id)?.permissions.has(PermissionsBitField.Flags.ManageRoles);
	if (user || isModerator)
		showEditorStats(interaction, ul);
	else await interaction.reply({ content: ul("modals.noPermission"), ephemeral: true });
}