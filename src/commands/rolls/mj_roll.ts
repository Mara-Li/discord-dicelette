import { cmdLn,ln } from "@localization";
import { EClient } from "@main";
import { filterChoices, reply, title } from "@utils";
import { getFirstRegisteredChar, getUserFromMessage } from "@utils/db";
import { rollStatistique } from "@utils/roll";
import { AutocompleteInteraction, CommandInteraction, CommandInteractionOptionResolver, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import i18next from "i18next";

const t = i18next.getFixedT("en");

export const mjRoll = {
	data: new SlashCommandBuilder()
		.setName(t("mjRoll.name"))
		.setNameLocalizations(cmdLn("mjRoll.name"))
		.setDescription(t("mjRoll.description"))
		.setDescriptionLocalizations(cmdLn("mjRoll.description"))
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
		.addSubcommand(sub => 
			sub
				.setName(t("dbRoll.name"))
				.setNameLocalizations(cmdLn("dbRoll.name"))
				.setDescription(t("dbRoll.description"))
				.setDescriptionLocalizations(cmdLn("dbRoll.description"))
				.addUserOption(option =>
					option
						.setName(t("display.userLowercase"))
						.setNameLocalizations(cmdLn("display.userLowercase"))
						.setDescription(t("mjRoll.user"))
						.setDescriptionLocalizations(cmdLn("mjRoll.user"))
						.setRequired(true)
				)
				.addStringOption(option =>
					option
						.setName(t("common.character"))
						.setNameLocalizations(cmdLn("common.character"))
						.setDescription(t("display.character"))
						.setDescriptionLocalizations(cmdLn("display.character"))
						.setRequired(false)
						.setAutocomplete(true)
				)
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
				)
		)
		.addSubcommand(sub =>
			sub
				.setName(t("rAtq.name"))
				.setDescription(t("rAtq.description"))
				.setNameLocalizations(cmdLn("rAtq.name"))
				.setDescriptionLocalizations(cmdLn("rAtq.description"))
				.addUserOption(option =>
					option
						.setName(t("display.userLowercase"))
						.setNameLocalizations(cmdLn("display.userLowercase"))
						.setDescription(t("mjRoll.user"))
						.setDescriptionLocalizations(cmdLn("mjRoll.user"))
						.setRequired(true)
				)
				.addStringOption(option =>
					option
						.setName(t("common.character"))
						.setNameLocalizations(cmdLn("common.character"))
						.setDescription(t("display.character"))
						.setDescriptionLocalizations(cmdLn("display.character"))
						.setRequired(false)
						.setAutocomplete(true)
				)
				.addStringOption(option =>
					option
						.setName(t("rAtq.atq_name.name"))
						.setNameLocalizations(cmdLn("rAtq.atq_name.name"))
						.setDescription(t("rAtq.atq_name.description"))
						.setDescriptionLocalizations(cmdLn("rAtq.atq_name.description"))
						.setRequired(true)
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
		),
	async autocomplete(interaction: AutocompleteInteraction, client: EClient) {
		const options = interaction.options as CommandInteractionOptionResolver;
		const fixed = options.getFocused(true);
		const guildData = client.settings.get(interaction.guild!.id);
		if (!guildData || !guildData.templateID) return;
		let choices: string[] = [];
		if (fixed.name === t("common.character")) {
			//get ALL characters from the guild
			const allCharactersFromGuild = Object.values(guildData.user)
				.map((data) => data.map((char) => char.charName ?? ""))
				.flat()
				.filter((data) => data.length > 0);
			choices = allCharactersFromGuild;
		}
		else if (fixed.name === t("common.statistic")) {
			choices = guildData.templateID.statsName;
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
		
		const user = options.getUser(t("display.userLowercase"), true);
		const charName = options.getString(t("common.character"), false)?.toLowerCase();
		let optionChar = options.getString(t("common.character")) ?? undefined;
		let charData = await getUserFromMessage(client.settings, user.id, interaction.guild, interaction, charName);
		
		if (!charData && !charName) {
			const char = await getFirstRegisteredChar(client, interaction, ul);
			charData = char?.userStatistique;
			optionChar = char?.optionChar || "";
		}
		if (!charData) {
			await reply(interaction,{ content: ul("error.notRegistered"), ephemeral: true });
			return;
		}
		const subcommand = options.getSubcommand(true);
		if (subcommand === ul("dbRoll.name")) {
			return await rollStatistique(interaction, client, charData, options, ul, optionChar);
		}
	}
};

