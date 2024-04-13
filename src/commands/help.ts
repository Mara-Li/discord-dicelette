/* eslint-disable no-case-declarations */
import { LINKS, Settings, Translation } from "@interface";
import { cmdLn, ln } from "@localization";
import { EClient } from "@main";
import { reply } from "@utils";
import { ApplicationCommand, Collection, CommandInteraction, CommandInteractionOptionResolver, Locale,SlashCommandBuilder, Snowflake } from "discord.js";
import i18next from "i18next";
import dedent from "ts-dedent";

const t = i18next.getFixedT("en");

export const help = {
	data: new SlashCommandBuilder()
		.setName(t("help.name"))
		.setNameLocalizations(cmdLn("help.name"))
		.setDescription(t("help.description"))
		.setDescriptionLocalizations(cmdLn("help.description"))
		.addSubcommand(sub =>
			sub
				.setName(t("help.info.name"))
				.setNameLocalizations(cmdLn("help.info.name"))
				.setDescription(t("help.info.description"))
				.setDescriptionLocalizations(cmdLn("help.info.description"))
		)
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
	async execute(interaction: CommandInteraction, client: EClient): Promise<void> {
		const options = interaction.options as CommandInteractionOptionResolver;
		const subcommand = options.getSubcommand(true);
		const ul = ln(interaction.locale as Locale);
		const link = interaction.locale === "fr" ? LINKS.fr : LINKS.en;
		switch (subcommand) {
		case (t("help.info.name")):
			const commandsID = await interaction.guild?.commands.fetch();
			if (!commandsID) return;
			const rollID = commandsID.findKey(command => command.name === "roll");
			const sceneID = commandsID.findKey(command => command.name === "scene");
			const msg = ul("help.message", {rollId: rollID, sceneId: sceneID, dbCMD: createHelpMessageDB(interaction.guild!.id, ul, client.settings, commandsID)});
			await reply(interaction,{ content: dedent(msg)});
			await interaction.followUp({ content: dedent(ul("help.diceNotation"))});
			break;
		case (t("help.bug.name")):
			await reply(interaction, { content: dedent(ul("help.bug.message", {link: link.bug}))});
			break;
		case (t("help.fr.name")):
			await reply(interaction, { content: dedent(ul("help.fr.message", {link: link.fr}))});
			break;
		}
	}
};

function getHelpDBCmd(
	commandsID: Collection<string, ApplicationCommand<unknown>>,
) {
	if (!commandsID) return;
	const commandToFind = [
		t("rAtq.name"),
		t("dbRoll.name"),
		t("graph.name"),
		t("display.title"),
	];
	const ids: {[key: string]: string | undefined} = {};
	for (const cmd of commandToFind) {
		ids[cmd] = commandsID.findKey(command => command.name === cmd);
	}
	return ids;
}

function createHelpMessageDB(
	guildID: Snowflake, 
	ul: Translation, 
	db: Settings,
	commandsID?: Collection<string, ApplicationCommand<unknown>>
) {
	if (!db.has(guildID, "templateID") || !commandsID) return "";
	const ids = getHelpDBCmd(commandsID);
	return ul("help.messageDB", {
		dbd: ids?.[t("rAtq.name")],
		dbroll: ids?.[t("dbRoll.name")],
		graph: ids?.[t("graph.name")],
		display: ids?.[t("display.title")],
	});
	
}