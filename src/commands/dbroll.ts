import { AutocompleteInteraction, CommandInteraction, CommandInteractionOptionResolver, Locale, SlashCommandBuilder } from "discord.js";

import { cmdLn, lError, ln } from "../localizations";
import en from "../localizations/locales/en";
import { calculate, rollWithInteraction, title } from "../utils";
import { getGuildData, getUserData, getUserFromMessage } from "../utils/db";
import { dmgRoll } from "./dbAtq";

export const rollForUser = {
	data: new SlashCommandBuilder()
		.setName(en.dbRoll.name)
		.setNameLocalizations(cmdLn("dbRoll.name"))
		.setDescription(en.dbRoll.description)
		.setDescriptionLocalizations(cmdLn("dbRoll.description"))
		.setDefaultMemberPermissions(0)
		.addStringOption(option =>
			option
				.setName(en.common.statistic)
				.setNameLocalizations(cmdLn("common.statistic"))
				.setDescription(en.dbRoll.options.statistic)
				.setDescriptionLocalizations(cmdLn("dbRoll.options.statistic"))
				.setRequired(true)
				.setAutocomplete(true)				
		)
		.addStringOption(option =>
			option
				.setName(en.common.character)
				.setDescription(en.dbRoll.options.character)
				.setNameLocalizations(cmdLn("common.character"))
				.setDescriptionLocalizations(cmdLn("dbRoll.options.character"))
				.setRequired(false)
				.setAutocomplete(true)
		)
		.addStringOption(option =>
			option
				.setName(en.dbRoll.options.comments.name)
				.setDescription(en.dbRoll.options.comments.description)
				.setNameLocalizations(cmdLn("dbRoll.options.comments.name"))
				.setDescriptionLocalizations(cmdLn("dbRoll.options.comments.description"))
				.setRequired(false)
		)
		.addStringOption(option =>
			option
				.setName(en.dbRoll.options.override.name)
				.setDescription(en.dbRoll.options.override.description)
				.setNameLocalizations(cmdLn("dbRoll.options.override.name"))
				.setDescriptionLocalizations(cmdLn("dbRoll.options.override.description"))
				.setRequired(false)
		)
		.addNumberOption(option =>
			option
				.setName(en.dbRoll.options.modificator.name)
				.setDescription(en.dbRoll.options.modificator.description)
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
		if (focused.name === en.common.statistic) {
			choices = guildData.templateID.statsName;
		} else if (focused.name === en.common.character) {
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
		const common = en.common;
		const lOpt = en.dbRoll.options;
		const ulError = ln(interaction.locale as Locale).error;
		let charName = options.getString(common.character) ?? undefined;
		try {
			let userStatistique = await getUserFromMessage(guildData, interaction.user.id,  interaction.guild, interaction, charName);
			if (!userStatistique && !charName){
			//find the first character registered
				const userData = getUserData(guildData, interaction.user.id);
				if (!userData) {
					await interaction.reply({ content: ulError.notRegistered, ephemeral: true });
					return;
				}
				const firstChar = userData[0];
				charName = title(firstChar.charName);
				userStatistique = await getUserFromMessage(guildData, interaction.user.id, interaction.guild, interaction, firstChar.charName);
			}
			if (!userStatistique) {
				await interaction.reply({ content: ulError.notRegistered, ephemeral: true });
				return;
			}
			//create the string for roll
			const statistique = options.getString(common.statistic, true);
			//model : {dice}{stats only if not comparator formula}{bonus/malus}{formula}{override/comparator}{comments}
			let comments = options.getString(lOpt.comments.name) ?? "";
			const override = options.getString(lOpt.override.name);
			const modificator = options.getNumber(lOpt.modificator.name) ?? 0;
			const userStat = userStatistique.stats[statistique];
			const template = userStatistique.template;
			const dice = template.diceType;
			const {calculation, comparator} = calculate(userStat, template.diceType, override, modificator);
			const charNameComments = charName ? `• **@${charName}**` : "";
			comments += `__[${title(statistique)}]__${charNameComments}`;
			const roll = `${dice}${calculation}${comparator} ${comments}`;
			await rollWithInteraction(interaction, roll, interaction.channel, template.critical);
		}
		catch (error) {
			const msgError = lError(error as Error, interaction);
			await interaction.reply({ content: msgError, ephemeral: true });
		}
	}
};

export const autCompleteCmd = [rollForUser, dmgRoll];