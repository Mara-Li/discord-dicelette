/* eslint-disable @typescript-eslint/no-unused-vars */
import { cmdLn, ln } from "@localization";
import { default as i18next } from "@localization/i18next";
import { EClient } from "@main";
import { filterChoices, reply, title } from "@utils";
import {getFirstRegisteredChar, getUserFromMessage } from "@utils/db";
import { rollDice } from "@utils/roll";
import { AutocompleteInteraction, CommandInteraction, CommandInteractionOptionResolver, Locale, SlashCommandBuilder } from "discord.js";
import removeAccents from "remove-accents";

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
	async autocomplete(interaction: AutocompleteInteraction, client: EClient) {
		const options = interaction.options as CommandInteractionOptionResolver;
		const focused = options.getFocused(true);
		const db = client.settings.get(interaction.guild!.id);
		if (!db || !db.templateID) return;
		const user = client.settings.get(interaction.guild!.id, `user.${interaction.user.id}`);
		if (!user) return;
		let choices: string[] = [];
		if (focused.name === t("rAtq.atq_name.name")) {
			const char = options.getString(t("common.character"));
			
			if (char){
				const values =  user.find((data) => {
					if (data.charName) return removeAccents(data.charName).toLowerCase() === removeAccents(char).toLowerCase();
					return false;
				});
				if (values?.damageName) choices = values.damageName;
			} else {
				for (const [, value] of Object.entries(user)) {
					if (value.damageName) choices = choices.concat(value.damageName);
				}
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
	async execute(interaction: CommandInteraction, client: EClient) {
		const options = interaction.options as CommandInteractionOptionResolver;
		const db = client.settings.get(interaction.guild!.id);
		if (!db || !interaction.guild || !interaction.channel) return;
		const user = client.settings.get(interaction.guild.id, `user.${interaction.user.id}`);
		if (!user) return;
		let charOptions = options.getString(t("common.character"));
		const charName = charOptions ? removeAccents(charOptions).toLowerCase() : undefined;
		const ul = ln(interaction.locale as Locale);
		try {
			let userStatistique = await getUserFromMessage(client.settings, interaction.user.id,  interaction.guild, interaction, charName);
			const userStatistiqueName = userStatistique?.userName ? removeAccents(userStatistique.userName).toLowerCase() : undefined;
			if (charOptions && userStatistiqueName !== charName) {
				await reply(interaction,{ content: ul("error.charName", {charName: title(charOptions)}), ephemeral: true });
				return;
			}
			if (!userStatistique && !charName) {
				const char = await getFirstRegisteredChar(client, interaction, ul);
				userStatistique = char?.userStatistique;
				charOptions = char?.optionChar ?? null;
			}
			if (!userStatistique) {
				await reply(interaction,{ content: ul("error.notRegistered"), ephemeral: true });
				return;
			}
			if (!userStatistique.damage) {
				await reply(interaction,{ content: ul("error.emptyDamage"), ephemeral: true });
				return;
			}
			return await rollDice(interaction, client, userStatistique, options, ul, charName);
		} catch (error) {
			console.error(error);
			await reply(interaction,{ content: t("error.generic", {e: (error as Error)}), ephemeral: true });
			return;
		}
	},
};

