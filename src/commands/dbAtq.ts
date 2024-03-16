/* eslint-disable @typescript-eslint/no-unused-vars */
import { AutocompleteInteraction, CommandInteraction, CommandInteractionOptionResolver, Locale, SlashCommandBuilder } from "discord.js";

import { cmdLn, ln } from "../localizations";
import en from "../localizations/locales/en";
import { rollWithInteraction, title } from "../utils";
import { getGuildData, getUserData, getUserFromMessage } from "../utils/db";

export const dmgRoll = {
	data: new SlashCommandBuilder()
		.setName(en.rAtq.name)
		.setDescription(en.rAtq.description)
		.setNameLocalizations(cmdLn("rAtq.name"))
		.setDescriptionLocalizations(cmdLn("rAtq.description"))
		.setDefaultMemberPermissions(0)
		.addStringOption(option =>
			option
				.setName(en.rAtq.atq_name.name)
				.setNameLocalizations(cmdLn("rAtq.atq_name.name"))
				.setDescription(en.rAtq.atq_name.description)
				.setDescriptionLocalizations(cmdLn("rAtq.atq_name.description"))
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
		.addNumberOption(option =>
			option
				.setName(en.dbRoll.options.modificator.name)
				.setDescription(en.dbRoll.options.modificator.description)
				.setNameLocalizations(cmdLn("dbRoll.options.modificator.name"))
				.setDescriptionLocalizations(cmdLn("dbRoll.options.modificator.description"))
				.setRequired(false)
		)
		.addStringOption(option =>
			option
				.setName(en.dbRoll.options.comments.name)
				.setDescription(en.dbRoll.options.comments.description)
				.setNameLocalizations(cmdLn("dbRoll.options.comments.name"))
				.setDescriptionLocalizations(cmdLn("dbRoll.options.comments.description"))
				.setRequired(false)
		),
	async autocomplete(interaction: AutocompleteInteraction) {
		const options = interaction.options as CommandInteractionOptionResolver;
		const focused = options.getFocused(true);
		const db = getGuildData(interaction);
		if (!db) return;
		const user = getUserData(db, interaction.user.id);
		if (!user) return;
		let choices: string[] = [];
		
		if (focused.name === en.rAtq.atq_name.name) {
			for (const [_, value] of Object.entries(user)) {
				if (value.damageName) choices = choices.concat(value.damageName);
			}
			choices = choices.concat(db.templateID.damageName);
			
		} else if (focused.name === en.common.character) {
			//get user characters 
			const allCharactersFromUser = user
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
		const options = interaction.options as CommandInteractionOptionResolver;
		const db = getGuildData(interaction);
		if (!db || !interaction.guild || !interaction.channel) return;
		const user = getUserData(db, interaction.user.id);
		if (!user) return;
		const atq = options.getString(en.rAtq.atq_name.name, true);
		const guildData = getGuildData(interaction);
		if (!guildData) return;
		const common = en.common;
		const lOpt = en.dbRoll.options;
		const ul = ln(interaction.locale as Locale).dbRoll;
		const ulError = ln(interaction.locale as Locale).error;
		let charName = options.getString(common.character) ?? undefined;
		let comments = options.getString(lOpt.comments.name) ?? "";
		try {
			let userStatistique = await getUserFromMessage(guildData, interaction.user.id,  interaction.guild, interaction, charName);
			if (!userStatistique && !charName) {
				//find the first character registered
				const userData = getUserData(guildData, interaction.user.id);
				if (!userData) {
					await interaction.reply({ content: ul.error.notRegistered, ephemeral: true });
					return;
				}
				const firstChar = userData[0];
				charName = title(firstChar.charName);
				userStatistique = await getUserFromMessage(guildData, interaction.user.id, interaction.guild, interaction, firstChar.charName);
			}
			if (!userStatistique) {
				await interaction.reply({ content: ul.error.notRegistered, ephemeral: true });
				return;
			}
			if (!userStatistique.damage) {
				await interaction.reply({ content: ul.error.noDamage, ephemeral: true });
				return;
			}
			const charNameComments = charName ? `• **@${charName}**` : "";
			comments += `__[${title(atq)}]__${charNameComments}`;
			//search dice
			const dice = userStatistique.damage?.[atq];
			if (!dice) {
				await interaction.reply({ content: ul.error.noDamage, ephemeral: true });
				return;
			}
			const modificator = options.getNumber(lOpt.modificator.name) ?? 0;
			const modificatorString = modificator > 0 ? `+${modificator}` : modificator < 0 ? `${modificator}` : "";
			const roll = `${dice}${modificatorString} ${comments}`;
			console.log(roll);
			await rollWithInteraction(interaction, roll, interaction.channel);
		} catch (error) {
			console.error(error);
			await interaction.reply({ content: ulError.generic(error as Error), ephemeral: true });
			return;
		}
	},
};

