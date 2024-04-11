import { cmdLn, lError, ln } from "@localization";
import { default as i18next } from "@localization/i18next";
import { EClient } from "@main";
import {filterChoices, reply, title } from "@utils";
import { getFirstRegisteredChar, getUserFromMessage } from "@utils/db";
import { rollStatistique } from "@utils/roll";
import { AutocompleteInteraction, CommandInteraction, CommandInteractionOptionResolver, SlashCommandBuilder } from "discord.js";
import removeAccents from "remove-accents";

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
	async autocomplete(interaction: AutocompleteInteraction, client: EClient) {
		const options = interaction.options as CommandInteractionOptionResolver;
		const focused = options.getFocused(true);
		const guildData = client.settings.get(interaction.guild!.id);
		if (!guildData) return;
		let choices: string[] = [];
		if (focused.name === t("common.statistic")) {
			choices = guildData.templateID.statsName;
		} else if (focused.name === t("common.character")) {
			//get user characters 
			const userData = client.settings.get(interaction.guild!.id, `user.${interaction.user.id}`);
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
	async execute(interaction: CommandInteraction, client: EClient) {
		if (!interaction.guild || !interaction.channel) return;
		const options = interaction.options as CommandInteractionOptionResolver;
		const guildData = client.settings.get(interaction.guild.id);
		const ul = ln(interaction.locale);
		if (!guildData) return;
		let optionChar = options.getString(t("common.character")) ?? undefined;
		const charName = optionChar ? removeAccents(optionChar.toLowerCase()) : undefined;
		
		try {
			let userStatistique = await getUserFromMessage(client.settings, interaction.user.id,  interaction.guild, interaction, charName);
			if (!userStatistique && !charName){
			//find the first character registered
				const char = await getFirstRegisteredChar(client, interaction, ul);
				userStatistique = char?.userStatistique;
				optionChar = char?.optionChar;
			}
			if (!userStatistique) {
				await reply(interaction,{ content: ul("error.notRegistered"), ephemeral: true });
				return;
			}
			
			if (!userStatistique.stats) {
				await reply(interaction,{ content: ul("error.noStats"), ephemeral: true });
				return;
			}
			return await rollStatistique(interaction, client, userStatistique, options, ul, optionChar);
		}
		catch (error) {
			console.error(error);
			const msgError = lError(error as Error, interaction);
			await reply(interaction,{ content: msgError, ephemeral: true });
		}
	}
};

