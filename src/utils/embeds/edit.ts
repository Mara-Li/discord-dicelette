import { EmbedBuilder, ModalSubmitInteraction } from "discord.js";
import { TFunction } from "i18next";
import removeAccents from "remove-accents";

import { title } from "..";
import { getTemplateWithDB } from "../db";
import { evalOneCombinaison } from "../verify_template";
import { getEmbeds, getEmbedsList } from "./parse";

export async function editStats(interaction: ModalSubmitInteraction, ul: TFunction<"translation", undefined>) {
	if (!interaction.message) return;
	const statsEmbeds = getEmbeds(ul, interaction?.message ?? undefined, "stats");
	if (!statsEmbeds) return;
	const values  = interaction.fields.getTextInputValue("allStats");
	const templateStats = await getTemplateWithDB(interaction);
	if (!templateStats) return;
	const valuesAsStats = values.split("\n- ").map(stat => {
		const [name, value] = stat.split(": ");
		return { name: removeAccents(name.replace("- ", "").trim().toLowerCase()), value };
	});
	//fusion all stats into an object instead of list
	const stats = valuesAsStats.reduce((acc, { name, value }) => {
		acc[name] = value;
		return acc;
	}, {} as {[name: string]: string});
	//verify value from template
	const newEmbedStats = new EmbedBuilder()
		.setTitle(title(ul("embed.stats")))
		.setColor("#0099ff");
	for (const [name, value] of Object.entries(stats)) {
		const stat = templateStats.statistics?.[name];
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
			newEmbedStats.addFields({
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
		newEmbedStats.addFields({
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
			if (!stats[name]) {
				//register the old value
				newEmbedStats.addFields({
					name: title(name),
					value: field.value,
					inline: true
				});
			}
		}
	}
		
	//get the other embeds
	const embedsList = getEmbedsList(ul, {which: "stats", embed: newEmbedStats}, interaction.message);
	await interaction.message.edit({ embeds: embedsList });
	await interaction.reply({ content: ul("modals.statsUpdated"), ephemeral: true });
	
}

