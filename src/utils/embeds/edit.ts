import { APIEmbedField, EmbedBuilder, ModalSubmitInteraction } from "discord.js";
import { TFunction } from "i18next";

import { roll } from "../../dice";
import { cleanSkillName, cleanStatsName, parseStatsString, title } from "..";
import { editUserButtons } from "../buttons";
import { getTemplateWithDB } from "../db";
import { evalOneCombinaison, evalStatsDice } from "../verify_template";
import { getEmbeds, getEmbedsList, removeEmbedsFromList } from "./parse";

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
		const stat = templateStats.statistics?.[cleanStatsName(name)];
		if (value.toLowerCase() === "x" 
			|| value.trim().length === 0 
			|| embedsStatsFields.find(field => cleanStatsName(field.name) === cleanStatsName(name))
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
				&& embedsStatsFields.find(field => cleanStatsName(field.name) === cleanStatsName(name))
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
		if (fieldsToAppend.find(f => cleanStatsName(f.name) === cleanStatsName(name))) continue;
		fieldsToAppend.push(field);
	}

	const newEmbedStats = new EmbedBuilder()
		.setTitle(title(ul("embed.stats")))
		.setColor(statsEmbeds.toJSON().color ?? "Aqua")
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

export async function editDice(interaction: ModalSubmitInteraction, ul: TFunction<"translation", undefined>) {
	if (!interaction.message) return;
	const diceEmbeds = getEmbeds(ul, interaction?.message ?? undefined, "damage");
	if (!diceEmbeds) return;
	const values = interaction.fields.getTextInputValue("allDice");
	const valuesAsDice = values.split("\n- ").map(dice => {
		const [name, value] = dice.split(/ ?: ?/);
		return { name: name.replace("- ", "").trim().toLowerCase(), value };
	});
	const dices = valuesAsDice.reduce((acc, { name, value }) => {
		acc[name] = value;
		return acc;
	}, {} as {[name: string]: string});
	const newEmbedDice: APIEmbedField[] = [];
	for (const [skill, dice] of Object.entries(dices)) {
		//test if dice is valid
		if (dice === "X" 
			|| dice.trim().length ===0 
			|| dice === "0" 
			|| newEmbedDice.find(field => cleanStatsName(field.name) === cleanStatsName(skill))
		) continue;
		const statsEmbeds = getEmbeds(ul, interaction?.message ?? undefined, "stats");
		if (!statsEmbeds) {
			if (!roll(dice)) {
				throw new Error(ul("error.invalidDice.withDice", {dice}));
			}
			continue;
		} 
		const statsValues = parseStatsString(statsEmbeds);
		const diceEvaluated = evalStatsDice(dice, statsValues);
		newEmbedDice.push({
			name: title(skill),
			value: diceEvaluated,
			inline: true
		});
	}
	const oldDice = diceEmbeds.toJSON().fields;
	if (oldDice) {
		for (const field of oldDice) {
			const name = field.name.toLowerCase();
			if (field.value !== "0" 
				&& field.value !== "X" 
				&& field.value.trim().length > 0 
				&& !newEmbedDice.find(field => cleanStatsName(field.name) === cleanStatsName(name))
			) {
			//register the old value
				newEmbedDice.push({
					name: title(name),
					value: field.value,
					inline: true
				});
			}
		}
	}
	//remove duplicate
	const fieldsToAppend: APIEmbedField[] = [];
	for (const field of newEmbedDice) {
		const name = field.name.toLowerCase();
		if (fieldsToAppend.find(f => cleanSkillName(f.name) === cleanSkillName(name))) continue;
		fieldsToAppend.push(field);
	}
	const diceEmbed = new EmbedBuilder()
		.setTitle(title(ul("embed.dice")))
		.setColor(diceEmbeds.toJSON().color ?? "Aqua")
		.addFields(fieldsToAppend);
	if (!fieldsToAppend || fieldsToAppend.length === 0) {
		//dice was removed
		const embedsList = getEmbedsList(ul, {which: "damage", embed: diceEmbed}, interaction.message);
		const toAdd = removeEmbedsFromList(embedsList.list, "damage", ul);
		const components = editUserButtons(ul, embedsList.exists.stats, false);
		await interaction.message.edit({ embeds: toAdd, components: [components] });
		await interaction.reply({ content: ul("modals.removed.dice"), ephemeral: true });
		return;
	} 
	const embedsList = getEmbedsList(ul, {which: "damage", embed: diceEmbed}, interaction.message);
	await interaction.message.edit({ embeds: embedsList.list });
	await interaction.reply({ content: ul("embeds.edit.dice"), ephemeral: true });
}