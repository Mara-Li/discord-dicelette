import { cmdLn } from "@localization";
import { EClient } from "@main";
import { CommandInteraction,CommandInteractionOptionResolver,SlashCommandBuilder } from "discord.js";
import i18next from "i18next";

const t= i18next.getFixedT("en");

export const delete_after = {
	data: new SlashCommandBuilder()
		.setName(t("timer.name"))
		.setNameLocalizations(cmdLn("timer.name"))
		.setDescription(t("timer.description"))
		.setDescriptionLocalizations(cmdLn("timer.description"))
		.addNumberOption(option =>
			option
				.setName(t("timer.option.name"))
				.setNameLocalizations(cmdLn("timer.option.name"))
				.setDescription(t("timer.option.description"))
				.setDescriptionLocalizations(cmdLn("timer.option.description"))
				.setRequired(true)
				.setMinValue(0)
				.setMaxValue(3600)
		),
	async execute(interaction: CommandInteraction, client: EClient): Promise<void> {
		if (!interaction.guild) return;
		const option = interaction.options as CommandInteractionOptionResolver;
		const timer = option.getNumber(t("timer.option.name"), true);
		client.settings.set(interaction.guild.id, timer * 1000, "deleteAfter");
		if (timer === 0) {
			await interaction.reply({ content: t("timer.delete", { timer }) });
		} else {
			await interaction.reply({ content: t("timer.success", { timer }) });
		}
	},
};