import { CommandInteraction, CommandInteractionOptionResolver, Locale,SlashCommandBuilder } from "discord.js";
import i18next from "i18next";
import dedent from "ts-dedent";

import { LINKS } from "../interface";
import { cmdLn, ln } from "../localizations";
import { reply } from "../utils";
import { deleteAfter } from "./rolls/base_roll";

const t = i18next.getFixedT("en");

export const help = {
	data: new SlashCommandBuilder()
		.setName(t("help.name"))
		.setNameLocalizations(cmdLn("help.name"))
		.setDescription(t("help.description"))
		.setDescriptionLocalizations(cmdLn("help.description"))
		.addSubcommand(sub => 
			sub
				.setName(t("help.bug.name"))
				.setNameLocalizations(cmdLn("help.bug.name"))
				.setDescription(t("help.bug.description"))
				.setDescriptionLocalizations(cmdLn("help.bug.description"))
		)
		.addSubcommand(sub =>
			sub
				.setName(t("help.fr.name"))
				.setNameLocalizations(cmdLn("help.fr.name"))
				.setDescription(t("help.fr.description"))
				.setDescriptionLocalizations(cmdLn("help.fr.description"))
		),
	async execute(interaction: CommandInteraction): Promise<void> {
		const options = interaction.options as CommandInteractionOptionResolver;
		const subcommand = options.getSubcommand(true);
		const ul = ln(interaction.locale as Locale);
		const link = interaction.locale === "fr" ? LINKS.fr : LINKS.en;
		if (!subcommand) {
			const commandsID = await interaction.guild?.commands.fetch();
			if (!commandsID) return;
			const rollID = commandsID.findKey(command => command.name === "roll");
			const sceneID = commandsID.findKey(command => command.name === "scene");
			const message = ul("help.message", {rollId: rollID, sceneId: sceneID});
			const replyMsg = await reply(interaction,{ content: dedent(message)});
			deleteAfter(replyMsg, 60000);
			return;
		}
		if (subcommand === t("help.bug.name")) {
			//get locale
			const message = ul("help.bug.message", {link: link.bug});
			await reply(interaction, { content: dedent(message)});
		} else if (subcommand === t("help.fr.name")) {
			//get locale
			const message = ul("help.fr.message", {link: link.fr});
			await reply(interaction, { content: dedent(message)});
		}
	}
};