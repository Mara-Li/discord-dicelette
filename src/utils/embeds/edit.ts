import { Embed, EmbedBuilder, ModalSubmitInteraction } from "discord.js";
import { TFunction } from "i18next";
import removeAccents from "remove-accents";

import { roll } from "../../dice";
import { calculate, formatRollCalculation, parseStatsString, title } from "..";
import { editUserButtons } from "../buttons";
import { getTemplateWithDB } from "../db";
import { evalOneCombinaison, evalStatsDice } from "../verify_template";
import { getEmbeds, getEmbedsList, parseEmbedFields, removeEmbedsFromList } from "./parse";

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

export async function editTemplate(interaction: ModalSubmitInteraction, ul: TFunction<"translation", undefined>) {
	if (!interaction.message) return;
	const templateEmbeds = getEmbeds(ul, interaction?.message ?? undefined, "template");
	if (!templateEmbeds) return;
	const templateFields = parseEmbedFields(templateEmbeds.toJSON() as Embed);
	const newEmbedTemplate = new EmbedBuilder()
		.setTitle(title(ul("embed.template")))
		.setColor("#0099ff");
	
	for (const [name, oldValue] of Object.entries(templateFields)) {
		const value = interaction.fields.fields.has(name) ? interaction.fields.fields.get(name)?.value : oldValue;
		if (!value) continue;
		if (name === ul("register.embed.dice") && oldValue !== value) {
			//verify dice with one value from the statistical embeds
			const statsEmbeds = getEmbeds(ul, interaction?.message ?? undefined, "stats");
			if (!statsEmbeds) {
				if (!roll(value)) {
					throw new Error(ul("error.invalidDice.withDice", {dice: value}));
				}
				continue;
			}
			const stats = parseEmbedFields(statsEmbeds.toJSON() as Embed);
			//take first value
			const firstStat = Object.values(stats)[0];
			let result = parseInt(firstStat, 10);
			if (isNaN(result)) {
				result = parseInt(firstStat.split("`").filter(x => x.trim().length > 0)[1].replace("=", "").trim(), 10);
			}
			const {calculation, comparator} = calculate(result, value, undefined, 0);
			const dice = formatRollCalculation(value, comparator, "", calculation);
			if (!roll(dice)) {
				throw new Error(ul("error.invalidDice.withDice", {dice}));
			}
		}
		newEmbedTemplate.addFields({
			name: title(name),
			value,
			inline: true
		});
	}
	const embedsList = getEmbedsList(ul, {which: "template", embed: newEmbedTemplate}, interaction.message);
	await interaction.message.edit({ embeds: embedsList });
	await interaction.reply({ content: ul("modals.templateUpdated"), ephemeral: true });
}

export async function editDice(interaction: ModalSubmitInteraction, ul: TFunction<"translation", undefined>) {
	if (!interaction.message) return;
	const diceEmbeds = getEmbeds(ul, interaction?.message ?? undefined, "damage");
	if (!diceEmbeds) return;
	const values = interaction.fields.getTextInputValue("allDice");
	const valuesAsDice = values.split("\n- ").map(dice => {
		const [name, value] = dice.split(": ");
		return { name: removeAccents(name.replace("- ", "").trim().toLowerCase()), value };
	});
	const dices = valuesAsDice.reduce((acc, { name, value }) => {
		acc[name] = value;
		return acc;
	}, {} as {[name: string]: string});
	const newEmbedDice = new EmbedBuilder()
		.setTitle(title(ul("embed.dice")))
		.setColor(diceEmbeds.toJSON().color ?? "Aqua");
	for (const [skill, dice] of Object.entries(dices)) {
		//test if dice is valid
		const statsEmbeds = getEmbeds(ul, interaction?.message ?? undefined, "stats");
		if (!statsEmbeds) {
			if (!roll(dice)) {
				throw new Error(ul("error.invalidDice.withDice", {dice}));
			}
			continue;
		} 
		const statsValues = parseStatsString(statsEmbeds);
		const diceEvaluated = evalStatsDice(dice, statsValues);
		newEmbedDice.addFields({
			name: title(skill),
			value: diceEvaluated,
			inline: true
		});
	}
	const oldDice = diceEmbeds.toJSON().fields;
	if (oldDice) {
		for (const field of oldDice) {
			const name = field.name.toLowerCase();
			if (!dices[name]) {
				//register the old value
				newEmbedDice.addFields({
					name: title(name),
					value: field.value,
					inline: true
				});
			}
		}
	}
	if (newEmbedDice.toJSON().fields?.length === 0) {
		//dice was removed
		const embedsList = getEmbedsList(ul, {which: "damage", embed: newEmbedDice}, interaction.message);
		const toAdd = removeEmbedsFromList(embedsList, "damage", ul);
		const components = editUserButtons(ul, true, false, true);
		await interaction.message.edit({ embeds: toAdd, components: [components] });
		await interaction.reply({ content: ul("modals.dice.removed"), ephemeral: true });
		return;
	} 
	const embedsList = getEmbedsList(ul, {which: "damage", embed: newEmbedDice}, interaction.message);
	await interaction.message.edit({ embeds: embedsList });
	

}