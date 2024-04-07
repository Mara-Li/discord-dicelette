import { CommandInteraction, CommandInteractionOptionResolver, PermissionFlagsBits, SlashCommandBuilder, roleMention } from "discord.js";
import { EClient } from "@main";
import { ln, cmdLn } from "@localization";
import { reply } from "@utils";
import i18next from "i18next";

const t = i18next.getFixedT("en");

export const autoRole = {
	data: new SlashCommandBuilder()
		.setName(t("autoRole.name"))
		.setNameLocalizations(cmdLn("autoRole.name"))
		.setDescription(t("autoRole.description"))
		.setDescriptionLocalizations(cmdLn("autoRole.description"))
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
		.addRoleOption(option =>
			option
				.setName(t("common.role"))
				.setDescription(t("autoRole.options"))
				.setRequired(true)
		),
	async execute(interaction: CommandInteraction, client: EClient) {
		if (!interaction.guild) return;
		const ul = ln(interaction.locale);
		const options = interaction.options as CommandInteractionOptionResolver;
		const role = options.getRole("role", true);
		client.settings.set(interaction.guild.id, role.id, "autoRole");
		await reply(interaction, ul("autoRole.set", {role: roleMention(role.id)}));
	}

}