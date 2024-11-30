import { type StatisticalTemplate, evalCombinaison } from "@dicelette/core";
import { ln } from "@localization";
import { reply } from "@utils";
import { continueCancelButtons, registerDmgButton } from "@utils/buttons";
import { getEmbeds, getStatistiqueFields } from "@utils/parse";
import * as Djs from "discord.js";
import { createStatsEmbed } from "..";
/**
 * Embed to display the statistics when adding a new user
 * @param interaction {Djs.ModalSubmitInteraction}
 * @param template {StatisticalTemplate}
 * @param page {number=2}
 * @param lang
 */
export async function embedStatistiques(
	interaction: Djs.ModalSubmitInteraction,
	template: StatisticalTemplate,
	page: number | undefined = 2,
	lang: Djs.Locale = Djs.Locale.EnglishGB
) {
	if (!interaction.message) return;
	const ul = ln(lang);
	const userEmbed = getEmbeds(ul, interaction.message, "user");
	if (!userEmbed) return;
	const statsEmbed = getEmbeds(ul, interaction.message, "stats");
	const { combinaisonFields, stats } = getStatistiqueFields(interaction, template, ul);
	//combine all embeds as one
	userEmbed.setFooter({ text: ul("common.page", { nb: page }) });
	//add old fields

	const statEmbeds = statsEmbed ?? createStatsEmbed(ul);
	for (const [stat, value] of Object.entries(stats)) {
		statEmbeds.addFields({
			name: stat.capitalize(),
			value: `\`${value}\``,
			inline: true,
		});
	}
	const statsWithoutCombinaison = template.statistics
		? Object.keys(template.statistics)
				.filter((stat) => !template.statistics![stat].combinaison)
				.map((name) => name.standardize())
		: [];
	const embedObject = statEmbeds.toJSON();
	const fields = embedObject.fields;
	if (!fields) return;
	const parsedFields: { [name: string]: string } = {};
	for (const field of fields) {
		parsedFields[field.name.standardize()] = field.value.removeBacktick().standardize();
	}

	const embedStats = Object.fromEntries(
		Object.entries(parsedFields).filter(([key]) => statsWithoutCombinaison.includes(key))
	);
	if (Object.keys(embedStats).length === statsWithoutCombinaison.length) {
		// noinspection JSUnusedAssignment
		let combinaison: { [name: string]: number } = {};
		combinaison = evalCombinaison(combinaisonFields, embedStats);
		//add combinaison to the embed
		for (const stat of Object.keys(combinaison)) {
			statEmbeds.addFields({
				name: stat.capitalize(),
				value: `\`${combinaisonFields[stat]}\` = ${combinaison[stat]}`,
				inline: true,
			});
		}

		await interaction.message.edit({
			embeds: [userEmbed, statEmbeds],
			components: [registerDmgButton(ul)],
		});
		await reply(interaction, { content: ul("modals.added.stats"), ephemeral: true });
		return;
	}
	await interaction.message.edit({
		embeds: [userEmbed, statEmbeds],
		components: [continueCancelButtons(ul)],
	});
	await reply(interaction, { content: ul("modals.added.stats"), ephemeral: true });
	return;
}

/**
 * Modal to display the statistics when adding a new user
 * Will display the statistics that are not already set
 * 5 statistics per page
 */
export async function showStatistiqueModal(
	interaction: Djs.ButtonInteraction,
	template: StatisticalTemplate,
	stats?: string[],
	page = 1
) {
	if (!template.statistics) return;
	const ul = ln(interaction.locale as Djs.Locale);
	const statsWithoutCombinaison =
		Object.keys(template.statistics).filter((stat) => {
			return !template.statistics?.[stat]?.combinaison;
		}) ?? [];
	const nbOfPages =
		Math.ceil(statsWithoutCombinaison.length / 5) >= 1
			? Math.ceil(statsWithoutCombinaison.length / 5)
			: page;
	const modal = new Djs.ModalBuilder()
		.setCustomId(`page${page}`)
		.setTitle(ul("modals.steps", { page, max: nbOfPages + 1 }));
	let statToDisplay = statsWithoutCombinaison;
	if (stats && stats.length > 0) {
		statToDisplay = statToDisplay.filter((stat) => !stats.includes(stat.unidecode()));
		if (statToDisplay.length === 0) {
			//remove button
			const button = registerDmgButton(ul);
			await reply(interaction, { content: ul("modals.alreadySet"), ephemeral: true });
			await interaction.message.edit({ components: [button] });
		}
	}
	const statsToDisplay = statToDisplay.slice(0, 4);
	const statisticsLowerCase = Object.fromEntries(
		Object.entries(template.statistics).map(([key, value]) => [key.standardize(), value])
	);
	for (const stat of statsToDisplay) {
		const cleanedName = stat.unidecode();
		const value = statisticsLowerCase[cleanedName];
		if (value.combinaison) continue;
		let msg = "";
		if (value.min && value.max)
			msg = ul("modals.enterValue.minAndMax", { min: value.min, max: value.max });
		else if (value.min) msg = ul("modals.enterValue.minOnly", { min: value.min });
		else if (value.max) msg = ul("modals.enterValue.maxOnly", { max: value.max });
		const input =
			new Djs.ActionRowBuilder<Djs.ModalActionRowComponentBuilder>().addComponents(
				new Djs.TextInputBuilder()
					.setCustomId(cleanedName)
					.setLabel(stat)
					.setPlaceholder(msg)
					.setRequired(true)
					.setValue("")
					.setStyle(Djs.TextInputStyle.Short)
			);
		modal.addComponents(input);
	}
	await interaction.showModal(modal);
}
