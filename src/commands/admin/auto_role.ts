import { CommandInteraction, CommandInteractionOptionResolver, PermissionFlagsBits, SlashCommandBuilder, roleMention } from "discord.js";
import { EClient } from "@main";
import { ln, cmdLn } from "@localization";
import { reply } from "@utils";
import i18next from "i18next";
import { Translation } from "../../interface";

const t = i18next.getFixedT("en");

export const autoRole = {
	data: new SlashCommandBuilder()
		.setName(t("autoRole.name"))
		.setNameLocalizations(cmdLn("autoRole.name"))
		.setDescription(t("autoRole.description"))
		.setDescriptionLocalizations(cmdLn("autoRole.description"))
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
		.addSubcommand(subcommand =>
			subcommand
				.setName(t("common.statistic"))
				.setNameLocalizations(cmdLn("common.statistic"))
				.setDescription(t("autoRole.stat.desc"))
				.setDescriptionLocalizations(cmdLn("autoRole.stat.desc"))
				.addRoleOption(option =>
				option
					.setName(t("common.role"))
					.setNameLocalizations(cmdLn("common.role"))
					.setDescription(t("autoRole.options"))
					.setDescriptionLocalizations(cmdLn("autoRole.options"))
					.setRequired(false)
			)
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName(t("common.dice"))
				.setNameLocalizations(cmdLn("common.dice"))
				.setDescription(t("autoRole.dice.desc"))	
			.addRoleOption(option =>
				option
				.setName(t("common.role"))
				.setNameLocalizations(cmdLn("common.role"))
				.setDescription(t("autoRole.options"))
				.setDescriptionLocalizations(cmdLn("autoRole.options"))
				.setRequired(false)
			)
		),
	async execute(interaction: CommandInteraction, client: EClient) {
		if (!interaction.guild) return;
		const ul = ln(interaction.locale);
		//get commands used
		const options = interaction.options as CommandInteractionOptionResolver;
		const subcommand = options.getSubcommand(true);
		if (subcommand === t("common.statistic")) return stats(options, client, ul, interaction);
		else if (subcommand === t("common.dice")) return dice(options, client, ul, interaction);
	}
}

function stats(options: CommandInteractionOptionResolver, client: EClient, ul: Translation, interaction: CommandInteraction) {
	const role = options.getRole(t("common.role"));
	if (!role) {
		//remove the role from the db
		client.settings.delete(interaction.guild!.id, "autoRole.stats");
		return reply(interaction, { content: ul("autoRole.stat.remove"), ephemeral: true });
	}
	client.settings.set(interaction.guild!.id, role.id, "autoRole.stats");
	return reply(interaction, { content: ul("autoRole.stat.set", { role: roleMention(role.id)}), ephemeral: true });
}

function dice(options: CommandInteractionOptionResolver, client: EClient, ul: Translation, interaction: CommandInteraction) {
	const role = options.getRole(t("common.role"));
	if (!role) {
		//remove the role from the db
		client.settings.delete(interaction.guild!.id, "autoRole.dice");
		return reply(interaction, { content: ul("autoRole.dice.remove"), ephemeral: true });
	}
	client.settings.set(interaction.guild!.id, role.id, "autoRole.dice");
	return reply(interaction, { content: ul("autoRole.dice.set", { role: roleMention(role.id)}), ephemeral: true });
}