import { AutocompleteInteraction, CommandInteraction, CommandInteractionOptionResolver, SlashCommandBuilder } from "discord.js";
import removeAccents from "remove-accents";

import { cmdLn, lError, ln } from "../localizations";
import { default as i18next } from "../localizations/i18next";
import {filterChoices, replaceFormulaInDice, rollWithInteraction, title } from "../utils";
import { getUserData, getUserFromMessage,guildInteractionData } from "../utils/db";

const t = i18next.getFixedT("en");

export const rollForUser = {
	data: new SlashCommandBuilder()
		.setName(t("dbRoll.name"))
		.setNameLocalizations(cmdLn("dbRoll.name"))
		.setDescription(t("dbRoll.description"))
		.setDescriptionLocalizations(cmdLn("dbRoll.description"))
		.setDefaultMemberPermissions(0)
		.addStringOption(option =>
			option
				.setName(t("common.statistic"))
				.setNameLocalizations(cmdLn("common.statistic"))
				.setDescription(t("dbRoll.options.statistic"))
				.setDescriptionLocalizations(cmdLn("dbRoll.options.statistic"))
				.setRequired(true)
				.setAutocomplete(true)				
		)
		.addStringOption(option =>
			option
				.setName(t("common.character"))
				.setDescription(t("dbRoll.options.character"))
				.setNameLocalizations(cmdLn("common.character"))
				.setDescriptionLocalizations(cmdLn("dbRoll.options.character"))
				.setRequired(false)
				.setAutocomplete(true)
		)
		.addStringOption(option =>
			option
				.setName(t("dbRoll.options.comments.name"))
				.setDescription(t("dbRoll.options.comments.description"))
				.setNameLocalizations(cmdLn("dbRoll.options.comments.name"))
				.setDescriptionLocalizations(cmdLn("dbRoll.options.comments.description"))
				.setRequired(false)
		)
		.addStringOption(option =>
			option
				.setName(t("dbRoll.options.override.name"))
				.setDescription(t("dbRoll.options.override.description"))
				.setNameLocalizations(cmdLn("dbRoll.options.override.name"))
				.setDescriptionLocalizations(cmdLn("dbRoll.options.override.description"))
				.setRequired(false)
		)
		.addNumberOption(option =>
			option
				.setName(t("dbRoll.options.modificator.name"))
				.setDescription(t("dbRoll.options.modificator.description"))
				.setNameLocalizations(cmdLn("dbRoll.options.modificator.name"))
				.setDescriptionLocalizations(cmdLn("dbRoll.options.modificator.description"))
				.setRequired(false)
		),
	async autocomplete(interaction: AutocompleteInteraction) {
		const options = interaction.options as CommandInteractionOptionResolver;
		const focused = options.getFocused(true);
		const guildData = guildInteractionData(interaction);
		if (!guildData) return;
		let choices: string[] = [];
		if (focused.name === t("common.statistic")) {
			choices = guildData.templateID.statsName;
		} else if (focused.name === t("common.character")) {
			//get user characters 
			const userData = getUserData(guildData, interaction.user.id);
			if (!userData) return;
			const allCharactersFromUser = userData
				.map((data) => data.charName ?? "")
				.filter((data) => data.length > 0);
				
			choices = allCharactersFromUser;
		}
		if (choices.length === 0) return;
		const filter = filterChoices(choices, interaction.options.getFocused());
		await interaction.respond(
			filter.map(result => ({ name: title(result), value: result}))
		);
	},
	async execute(interaction: CommandInteraction) {
		if (!interaction.guild || !interaction.channel) return;
		const options = interaction.options as CommandInteractionOptionResolver;
		const guildData = guildInteractionData(interaction);
		const ul = ln(interaction.locale);
		if (!guildData) return;
		let optionChar = options.getString(t("common.character"));
		const charName = optionChar ? removeAccents(optionChar.toLowerCase()) : undefined;
		
		try {
			let userStatistique = await getUserFromMessage(guildData, interaction.user.id,  interaction.guild, interaction, charName);
			if (!userStatistique && !charName){
			//find the first character registered
				const userData = getUserData(guildData, interaction.user.id);
				if (!userData) {
					await interaction.reply({ content: ul("error.notRegistered"), ephemeral: true });
					return;
				}
				const firstChar = userData[0];
				optionChar = title(firstChar.charName);
				userStatistique = await getUserFromMessage(guildData, interaction.user.id, interaction.guild, interaction, firstChar.charName);
			}
			if (!userStatistique) {
				await interaction.reply({ content: ul("error.notRegistered"), ephemeral: true });
				return;
			}
			if (!userStatistique.stats) {
				await interaction.reply({ content: ul("error.noStats"), ephemeral: true });
				return;
			}
			//create the string for roll
			const statistique = options.getString(t("common.statistic"), true).toLowerCase();
			//model : {dice}{stats only if not comparator formula}{bonus/malus}{formula}{override/comparator}{comments}
			let comments = options.getString(t("dbRoll.options.comments.name")) ?? "";
			const override = options.getString(t("dbRoll.options.override.name"));
			const modificator = options.getNumber(t("dbRoll.options.modificator.name")) ?? 0;
			const userStat = userStatistique.stats?.[removeAccents(statistique)];
			const template = userStatistique.template;
			let dice = template.diceType?.replaceAll("$", userStat.toString());
			if (!dice) {
				await interaction.reply({ content: ul("error.noDice"), ephemeral: true });
				return;
			}
			if (override) {
				const SIGN_REGEX =/(?<sign>[><=!]+)(?<comparator>(\d+))/;
				const diceMatch = SIGN_REGEX.exec(dice);
				const overrideMatch = SIGN_REGEX.exec(override);
				if (diceMatch && overrideMatch && diceMatch.groups && overrideMatch.groups) {
					dice = dice.replace(diceMatch[0], overrideMatch[0]);
				} else if (!diceMatch && overrideMatch) {
					dice += overrideMatch[0];
				}
			}
			const charNameComments = optionChar ? ` • **@${title(optionChar)}**` : "";
			comments += ` __[${title(statistique)}]__${charNameComments}`;
			const modificatorString = modificator > 0 ? `+${modificator}` : modificator < 0 ? `${modificator}` : "";
			const comparatorMatch = (/(?<sign>[><=!]+)(?<comparator>(\d+))/).exec(dice);
			let comparator = "";
			if (comparatorMatch) {
				//remove from dice
				dice = dice.replace(comparatorMatch[0], "");
				comparator = comparatorMatch[0];
			}
			const roll = `${replaceFormulaInDice(dice)}${modificatorString}${comparator} ${comments}`;
			await rollWithInteraction(interaction, roll, interaction.channel, template.critical);
		}
		catch (error) {
			console.error(error);
			const msgError = lError(error as Error, interaction);
			await interaction.reply({ content: msgError, ephemeral: true });
		}
	}
};

