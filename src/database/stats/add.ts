import { evalCombinaison, type StatisticalTemplate } from "@dicelette/core";
import { lError, ln } from "@localization";
import { removeEmojiAccents, reply, title } from "@utils";
import { continueCancelButtons, registerDmgButton } from "@utils/buttons";
import { getEmbeds, getStatistiqueFields } from "@utils/parse";
import { ActionRowBuilder, type ButtonInteraction, EmbedBuilder, type Locale, type ModalActionRowComponentBuilder, ModalBuilder, type ModalSubmitInteraction, TextInputBuilder, TextInputStyle } from "discord.js";

/**
 * Embed to display the statistics when adding a new user
 * @param interaction {ModalSubmitInteraction}
 * @param template {StatisticalTemplate}
 * @param page {number}
 */
export async function embedStatistiques(interaction: ModalSubmitInteraction, template: StatisticalTemplate, page = 2) {
	if (!interaction.message) return;
	const ul = ln(interaction.locale as Locale);
	const userEmbed = getEmbeds(ul, interaction.message, "user");
	if (!userEmbed) return;
	const statsEmbed = getEmbeds(ul, interaction.message, "stats");
	try {
		const { combinaisonFields, stats } = getStatistiqueFields(interaction, template);
		//combine all embeds as one
		userEmbed.setFooter({ text: ul("common.page", { nb: page }) });
		//add old fields

		const statEmbeds = statsEmbed ?? new EmbedBuilder()
			.setTitle(ul("embed.stats"))
		for (const [stat, value] of Object.entries(stats)) {
			statEmbeds.addFields({
				name: title(`✏️ ${title(stat)}`),
				value: value.toString(),
				inline: true,
			});
		}
		const statsWithoutCombinaison = template.statistics ? Object.keys(template.statistics).filter(stat => !template.statistics![stat].combinaison).map(name => removeEmojiAccents(name)) : [];
		const embedObject = statEmbeds.toJSON();
		const fields = embedObject.fields;
		if (!fields) return;
		const parsedFields: { [name: string]: string; } = {};
		for (const field of fields) {
			parsedFields[removeEmojiAccents(field.name)] = field.value.toLowerCase();
		}

		const embedStats = Object.fromEntries(Object.entries(parsedFields).filter(
			([key,]) => statsWithoutCombinaison.includes(key)
		));
		if (Object.keys(embedStats).length === statsWithoutCombinaison.length) {
			let combinaison: { [name: string]: number; } = {};
			try {
				combinaison = evalCombinaison(combinaisonFields, embedStats);
				//add combinaison to the embed
				for (const stat of Object.keys(combinaison)) {
					statEmbeds.addFields({
						name: title(`✏️ ${title(stat)}`),
						value: `\`${combinaisonFields[stat]}\` = ${combinaison[stat]}`,
						inline: true,
					});
				}
			} catch (error) {
				const errorMsg = lError(error as Error, interaction);
				await reply(interaction, { content: errorMsg, ephemeral: true });
				return;
			}
			await interaction.message.edit({ embeds: [userEmbed, statEmbeds], components: [registerDmgButton(ul)] });
			await reply(interaction, { content: ul("modals.added.stats"), ephemeral: true });
			return;
		}
		await interaction.message.edit({ embeds: [userEmbed, statEmbeds], components: [continueCancelButtons(ul)] });
		await reply(interaction, { content: ul("modals.added.stats"), ephemeral: true });
		return;
	} catch (error) {
		const errorMsg = lError(error as Error, interaction);
		await reply(interaction, { content: errorMsg, ephemeral: true });
	}
}

/**
 * Modal to display the statistics when adding a new user
 * Will display the statistics that are not already set 
 * 5 statistics per page
 * @param interaction {ButtonInteraction}
 * @param template {StatisticalTemplate}
 * @param stats {string[]}
 * @param page {number}
 */
export async function showStatistiqueModal(interaction: ButtonInteraction, template: StatisticalTemplate, stats?: string[], page = 1) {
	if (!template.statistics) return;
	const ul = ln(interaction.locale as Locale);
	const statsWithoutCombinaison = Object.keys(template.statistics).filter(stat => {
		return !template.statistics?.[stat]?.combinaison;
	}) ?? [];
	const nbOfPages = Math.ceil(statsWithoutCombinaison.length / 5) >= 1 ? Math.ceil(statsWithoutCombinaison.length / 5) : page;
	const modal = new ModalBuilder()
		.setCustomId(`page${page}`)
		.setTitle(ul("modals.steps", { page, max: nbOfPages + 1 }));
	let statToDisplay = statsWithoutCombinaison;
	if (stats && stats.length > 0) {
		statToDisplay = statToDisplay.filter(stat => !stats.includes(removeEmojiAccents(stat)));
		if (statToDisplay.length === 0) {
			//remove button
			const button = registerDmgButton(ul);
			await reply(interaction, { content: ul("modals.alreadySet"), ephemeral: true });
			await interaction.message.edit({ components: [button] });
		}
	}
	const statsToDisplay = statToDisplay.slice(0, 4);
	const statisticsLowerCase = Object.fromEntries(Object.entries(template.statistics).map(([key, value]) => [removeEmojiAccents(key), value]));
	for (const stat of statsToDisplay) {
		const cleanedName = removeEmojiAccents(stat);
		const value = statisticsLowerCase[cleanedName];
		if (value.combinaison) continue;
		let msg = "";
		if (value.min && value.max)
			msg = ul("modals.enterValue.minAndMax", { min: value.min, max: value.max });
		else if (value.min) msg = ul("modals.enterValue.minOnly", { min: value.min });
		else if (value.max) msg = ul("modals.enterValue.maxOnly", { max: value.max });
		const input = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
			new TextInputBuilder()
				.setCustomId(cleanedName)
				.setLabel(stat)
				.setPlaceholder(msg)
				.setRequired(true)
				.setValue("")
				.setStyle(TextInputStyle.Short)
		);
		modal.addComponents(input);
	}
	await interaction.showModal(modal);
}

