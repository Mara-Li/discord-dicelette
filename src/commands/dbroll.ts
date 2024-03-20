import { AutocompleteInteraction, CommandInteraction, CommandInteractionOptionResolver, SlashCommandBuilder } from "discord.js";

import { cmdLn, lError } from "../localizations";
import { default as i18next } from "../localizations/i18next";
import { calculate, formatRollCalculation, rollWithInteraction, title } from "../utils";
import { getGuildData, getUserData, getUserFromMessage } from "../utils/db";
import { dmgRoll } from "./dbAtq";

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
		const guildData = getGuildData(interaction);
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
		await interaction.respond(
			choices.map(result => ({ name: result, value: result}))
		);
	},
	async execute(interaction: CommandInteraction) {
		if (!interaction.guild || !interaction.channel) return;
		const options = interaction.options as CommandInteractionOptionResolver;
		const guildData = getGuildData(interaction);
		if (!guildData) return;
		let charName = options.getString(t("common.character")) ?? undefined;
		try {
			let userStatistique = await getUserFromMessage(guildData, interaction.user.id,  interaction.guild, interaction, charName);
			if (!userStatistique && !charName){
			//find the first character registered
				const userData = getUserData(guildData, interaction.user.id);
				if (!userData) {
					await interaction.reply({ content: t("error.notRegistered"), ephemeral: true });
					return;
				}
				const firstChar = userData[0];
				charName = title(firstChar.charName);
				userStatistique = await getUserFromMessage(guildData, interaction.user.id, interaction.guild, interaction, firstChar.charName);
			}
			if (!userStatistique) {
				await interaction.reply({ content: t("error.notRegistered"), ephemeral: true });
				return;
			}
			if (!userStatistique.stats) {
				await interaction.reply({ content: t("error.noStats"), ephemeral: true });
				return;
			}
			//create the string for roll
			const statistique = options.getString(t("common.statistic"), true);
			//model : {dice}{stats only if not comparator formula}{bonus/malus}{formula}{override/comparator}{comments}
			let comments = options.getString(t("dbRoll.options.comments.name")) ?? "";
			const override = options.getString(t("dbRoll.options.override.name"));
			const modificator = options.getNumber(t("dbRoll.options.modificator.name")) ?? 0;
			const userStat = userStatistique.stats?.[statistique];
			const template = userStatistique.template;
			const dice = template.diceType;
			if (!dice) {
				await interaction.reply({ content: t("error.noDice"), ephemeral: true });
				return;
			}
			const {calculation, comparator} = calculate(userStat, dice, override, modificator);
			const charNameComments = charName ? ` • **@${title(charName)}**` : "";
			comments += `__[${title(statistique)}]__${charNameComments}`;
			const roll = formatRollCalculation(dice, comparator, comments, calculation);
			await rollWithInteraction(interaction, roll, interaction.channel, template.critical);
		}
		catch (error) {
			const msgError = lError(error as Error, interaction);
			await interaction.reply({ content: msgError, ephemeral: true });
		}
	}
};

export const autCompleteCmd = [rollForUser, dmgRoll];