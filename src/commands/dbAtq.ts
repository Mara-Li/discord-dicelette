/* eslint-disable @typescript-eslint/no-unused-vars */
import { AutocompleteInteraction, CommandInteraction, CommandInteractionOptionResolver, Locale, SlashCommandBuilder } from "discord.js";
import removeAccents from "remove-accents";

import { cmdLn, ln } from "../localizations";
import { default as i18next } from "../localizations/i18next";
import { filterChoices, generateStatsDice, rollWithInteraction, title } from "../utils";
import { guildInteractionData, getUserData, getUserFromMessage } from "../utils/db";

const t = i18next.getFixedT("en");

export const dmgRoll = {
	data: new SlashCommandBuilder()
		.setName(t("rAtq.name"))
		.setDescription(t("rAtq.description"))
		.setNameLocalizations(cmdLn("rAtq.name"))
		.setDescriptionLocalizations(cmdLn("rAtq.description"))
		.setDefaultMemberPermissions(0)
		.addStringOption(option =>
			option
				.setName(t("rAtq.atq_name.name"))
				.setNameLocalizations(cmdLn("rAtq.atq_name.name"))
				.setDescription(t("rAtq.atq_name.description"))
				.setDescriptionLocalizations(cmdLn("rAtq.atq_name.description"))
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
		.addNumberOption(option =>
			option
				.setName(t("dbRoll.options.modificator.name"))
				.setDescription(t("dbRoll.options.modificator.description"))
				.setNameLocalizations(cmdLn("dbRoll.options.modificator.name"))
				.setDescriptionLocalizations(cmdLn("dbRoll.options.modificator.description"))
				.setRequired(false)
		)
		.addStringOption(option =>
			option
				.setName(t("dbRoll.options.comments.name"))
				.setDescription(t("dbRoll.options.comments.description"))
				.setNameLocalizations(cmdLn("dbRoll.options.comments.name"))
				.setDescriptionLocalizations(cmdLn("dbRoll.options.comments.description"))
				.setRequired(false)
		),
	async autocomplete(interaction: AutocompleteInteraction) {
		const options = interaction.options as CommandInteractionOptionResolver;
		const focused = options.getFocused(true);
		const db = guildInteractionData(interaction);
		if (!db || !db.templateID) return;
		const user = getUserData(db, interaction.user.id);
		if (!user) return;
		let choices: string[] = [];
		if (focused.name === t("rAtq.atq_name.name")) {
			for (const [, value] of Object.entries(user)) {
				if (value.damageName) choices = choices.concat(value.damageName);
			}
			if (db.templateID.damageName && db.templateID.damageName.length > 0)
				choices = choices.concat(db.templateID.damageName);
		} else if (focused.name === t("common.character")) {
			//get user characters 
			const allCharactersFromUser = user
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
		const options = interaction.options as CommandInteractionOptionResolver;
		const db = guildInteractionData(interaction);
		if (!db || !interaction.guild || !interaction.channel) return;
		const user = getUserData(db, interaction.user.id);
		if (!user) return;
		const atq = removeAccents(options.getString(t("rAtq.atq_name.name"), true).toLowerCase());
		const guildData = guildInteractionData(interaction);
		if (!guildData) return;
		let charOptions = options.getString(t("common.character"));
		const charName = charOptions ? removeAccents(charOptions).toLowerCase() : undefined;
		let comments = options.getString(t("dbRoll.options.comments.name")) ?? "";
		const ul = ln(interaction.locale as Locale);
		try {
			let userStatistique = await getUserFromMessage(guildData, interaction.user.id,  interaction.guild, interaction, charName);
			if (!userStatistique && !charName) {
				//find the first character registered
				const userData = getUserData(guildData, interaction.user.id);
				if (!userData) {
					await interaction.reply({ content: ul("error.notRegistered"), ephemeral: true });
					return;
				}
				const firstChar = userData[0];
				charOptions = title(firstChar.charName);
				userStatistique = await getUserFromMessage(guildData, interaction.user.id, interaction.guild, interaction, firstChar.charName);
			}
			if (!userStatistique) {
				await interaction.reply({ content: ul("error.notRegistered"), ephemeral: true });
				return;
			}
			if (!userStatistique.damage) {
				await interaction.reply({ content: ul("error.emptyDamage"), ephemeral: true });
				return;
			}
			const charNameComments = charOptions ? ` • **@${title(charOptions)}**` : "";
			comments += ` __[${title(atq)}]__${charNameComments}`;
			//search dice
			let dice = userStatistique.damage?.[atq.toLowerCase()];
			if (!dice) {
				await interaction.reply({ content: ul("error.noDamage", {atq: title(atq), charName: charName ?? ""}), ephemeral: true });
				return;
			}
			dice = generateStatsDice(dice, userStatistique.stats);
			const modificator = options.getNumber(t("dbRoll.options.modificator.name")) ?? 0;
			const modificatorString = modificator > 0 ? `+${modificator}` : modificator < 0 ? `${modificator}` : "";
			const comparatorMatch = /(?<sign>[><=!]+)(?<comparator>(\d+))/.exec(dice);
			let comparator = "";
			if (comparatorMatch) {
				dice = dice.replace(comparatorMatch[0], "");
				comparator = comparatorMatch[0];
			}
			const roll = `${dice}${modificatorString}${comparator} ${comments}`;
			await rollWithInteraction(interaction, roll, interaction.channel);
		} catch (error) {
			console.error(error);
			await interaction.reply({ content: t("error.generic", {e: (error as Error)}), ephemeral: true });
			return;
		}
	},
};

