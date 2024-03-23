import { ActionRowBuilder, ButtonInteraction, EmbedBuilder,Locale, ModalActionRowComponentBuilder,ModalBuilder, ModalSubmitInteraction, TextInputBuilder, TextInputStyle } from "discord.js";

import { StatisticalTemplate } from "../../interface";
import { lError,ln } from "../../localizations";
import { title } from "../../utils";
import { continueCancelButtons,registerDmgButton } from "../../utils/buttons";
import { getStatistiqueFields } from "../../utils/parse_modals";
import { ensureEmbed, evalCombinaison } from "../../utils/verify_template";


export async function embedStatistiques(interaction: ModalSubmitInteraction, template: StatisticalTemplate, page = 2) {
	if (!interaction.message) return;
	const ul = ln(interaction.locale as Locale);
	const oldEmbeds = ensureEmbed(interaction.message);
	try {
		const { combinaisonFields, stats } = getStatistiqueFields(interaction, template);
		//combine all embeds as one
		const embed = new EmbedBuilder()
			.setTitle(ul("embed.add.title"))
			.setThumbnail(oldEmbeds.thumbnail?.url || "")
			.setFooter({ text: ul("common.page", { nb: page }) });
		//add old fields
		for (const field of oldEmbeds.fields) {
			embed.addFields(field);
		}
		for (const [stat, value] of Object.entries(stats)) {
			embed.addFields({
				name: title(`✏️ ${title(stat)}`),
				value: value.toString(),
				inline: true,
			});
		}
		const statsWithoutCombinaison = template.statistics ? Object.keys(template.statistics).filter(stat => !template.statistics![stat].combinaison) : [];
		const embedObject = embed.toJSON();
		const fields = embedObject.fields;
		if (!fields) return;
		const parsedFields: { [name: string]: string; } = {};
		for (const field of fields) {
			parsedFields[field.name.toLowerCase().replace("✏️", "").trim()] = field.value.toLowerCase();
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
					embed.addFields({
						name: title(`✏️ ${title(stat)}`),
						value: `\`${combinaisonFields[stat]}\` = ${combinaison[stat]}`,
						inline: true,
					});
				}
			} catch (error) {
				const errorMsg = lError(error as Error, interaction);
				await interaction.reply({ content: errorMsg, ephemeral: true });
				return;
			}
			await interaction.message.edit({ embeds: [embed], components: [registerDmgButton(ul)] });
			await interaction.reply({ content: ul("modals.added.stats"), ephemeral: true });
			return;
		}
		await interaction.message.edit({ embeds: [embed], components: [continueCancelButtons(ul)] });
		await interaction.reply({ content: ul("modals.added.stats"), ephemeral: true });
		return;
	} catch (error) {
		const errorMsg = lError(error as Error, interaction);
		await interaction.reply({ content: errorMsg, ephemeral: true });
	}
}export async function showStatistiqueModal(interaction: ButtonInteraction, template: StatisticalTemplate, stats?: string[], page = 1) {
	if (!template.statistics) return;
	const ul = ln(interaction.locale as Locale);
	const statsWithoutCombinaison = Object.keys(template.statistics).filter(stat => !template.statistics![stat].combinaison) ?? [];
	const nbOfPages = Math.ceil(statsWithoutCombinaison.length / 5) >= 1 ? Math.ceil(statsWithoutCombinaison.length / 5) : page;
	const modal = new ModalBuilder()
		.setCustomId(`page${page}`)
		.setTitle(ul("modals.steps", { page, max: nbOfPages + 1 }));
	let statToDisplay = statsWithoutCombinaison;
	if (stats && stats.length > 0) {
		statToDisplay = statToDisplay.filter(stat => !stats.includes(stat));
		if (statToDisplay.length === 0) {
			//remove button
			const button = registerDmgButton(ul);
			await interaction.reply({ content: ul("modals.alreadySet"), ephemeral: true });
			await interaction.message.edit({ components: [button] });
		}
	}
	const statsToDisplay = statToDisplay.slice(0, 4);
	for (const stat of statsToDisplay) {
		const value = template.statistics[stat];
		if (value.combinaison) continue;
		let msg = "";
		if (value.min && value.max)
			msg = ul("modals.enterValue.minAndMax", { min: value.min, max: value.max });
		else if (value.min) msg = ul("modals.enterValue.minOnly", { min: value.min });
		else if (value.max) msg = ul("modals.enterValue.maxOnly", { max: value.max });
		const input = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
			new TextInputBuilder()
				.setCustomId(stat)
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

