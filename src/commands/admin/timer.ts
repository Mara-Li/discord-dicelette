import { cmdLn, ln } from "@localization";
import { EClient } from "@main";
import { CommandInteraction,CommandInteractionOptionResolver,EmbedBuilder,Locale,PermissionFlagsBits,SlashCommandBuilder } from "discord.js";
import i18next from "i18next";

const t= i18next.getFixedT("en");

export const delete_after = {
	data: new SlashCommandBuilder()
		.setName(t("timer.name"))
		.setNameLocalizations(cmdLn("timer.name"))
		.setDescription(t("timer.description"))
		.setDescriptionLocalizations(cmdLn("timer.description"))
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
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
		const ul = ln(interaction.locale as Locale);
		const timer = option.getNumber(t("timer.option.name"), true);
		client.settings.set(interaction.guild.id, timer * 1000, "deleteAfter");
		if (timer === 0) {
			await interaction.reply({ content: ul("timer.delete", { timer }) });
		} else {
			await interaction.reply({ content: ul("timer.success", { timer }) });
		}
	},
};

export const displayConfig = {
	data: new SlashCommandBuilder()
		.setName(t("config.name"))
		.setNameLocalizations(cmdLn("config.name"))
		.setDescription(t("config.description"))
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
		.setDescriptionLocalizations(cmdLn("config.description")),
	async execute(interaction: CommandInteraction, client: EClient): Promise<void> {
		if (!interaction.guild) return;
		const timer = client.settings.get(interaction.guild.id, "deleteAfter");
		const ul = ln(interaction.locale as Locale);
		const logs = client.settings.get(interaction.guild.id, "logs");
		const rollChannel = client.settings.get(interaction.guild.id, "rollChannel");
		const disableThread = client.settings.get(interaction.guild.id, "disableThread");
		const autoRole = client.settings.get(interaction.guild.id, "autoRole");
		const managerId = client.settings.get(interaction.guild.id, "managerId");
		const baseEmbed = new EmbedBuilder()
			.setTitle(t("config.title",{ guild: interaction.guild.name}))
			.setColor("Random");
		if (timer) {
			baseEmbed.addFields({
				name: ul("config.timer"),
				value: `${timer / 1000}s`,
			});
		}
		if (logs) {
			baseEmbed.addFields({
				name: ul("config.logs"),
				value: `<#${logs}>`,
			});
		}
		if (rollChannel) {
			baseEmbed.addFields({
				name: ul("config.rollChannel"),
				value: `<#${rollChannel}>`,
			});
		}
		if (disableThread) {
			baseEmbed.addFields({
				name: ul("config.disableThread"),
				value: ul("common.yes"),
			});
		}
		if (autoRole?.dice) {
			baseEmbed.addFields({
				name: ul("config.autoRole.dice"),
				value: `<@&${autoRole.dice}>`,
			});
		}
		if (autoRole?.stats) {
			baseEmbed.addFields({
				name: ul("config.autoRole.stats"),
				value: `<@&${autoRole.stats}>`,
			});
		}
		
		if (managerId) {
			baseEmbed.addFields({
				name: ul("config.managerId"),
				value: `<#${managerId}>`,
			});
		}

		if (client.settings.has(interaction.guild.id, "templateID")) {
			const templateID = client.settings.get(interaction.guild.id, "templateID");
			const { channelId, messageId, statsName, damageName } = templateID ?? {};
			if (messageId && messageId.length > 0 && channelId && channelId.length > 0){
				const messageLink = `https://discord.com/channels/${interaction.guild.id}/${channelId}/${messageId}`;
				baseEmbed.addFields({
					name: ul("config.templateID"),
					value: messageLink,
				});
			}
			if (statsName && statsName.length > 0) {
				baseEmbed.addFields({
					name: ul("config.statsName"),
					value: `- ${statsName.join("\n- ")}`,
				});
			}
			if (damageName && damageName.length > 0) {
				baseEmbed.addFields({
					name: ul("config.damageName"),
					value: `- ${damageName.join("\n- ")}`,
				});
			}
		}

		await interaction.reply({ embeds: [baseEmbed] });
	},
};