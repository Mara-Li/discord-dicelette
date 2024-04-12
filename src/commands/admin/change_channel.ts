import { cmdLn, ln } from "@localization";
import { EClient } from "@main";
import { reply } from "@utils";
import { channelMention,ChannelType, CommandInteraction, CommandInteractionOptionResolver, Locale, PermissionFlagsBits, SlashCommandBuilder, TextChannel, ThreadChannel } from "discord.js";
import i18next from "i18next";

const t = i18next.getFixedT("en");


export const logs = {
	data: new SlashCommandBuilder()
		.setName(t("logs.name"))
		.setNameLocalizations(cmdLn("logs.name"))
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
		.setDescription(t("logs.description"))
		.setDescriptionLocalizations(cmdLn("logs.description"))
		.setNameLocalizations(cmdLn("logs.name"))
		.addChannelOption(option =>
			option
				.setName(t("common.channel"))
				.setDescription(t("logs.options"))
				.setDescriptionLocalizations(cmdLn("logs.options"))
				.setNameLocalizations(cmdLn("common.channel"))
				.setRequired(false)
				.addChannelTypes(ChannelType.GuildText, ChannelType.PrivateThread, ChannelType.PublicThread)
		),
	async execute(interaction: CommandInteraction, client: EClient): Promise<void> {
		if (!interaction.guild) return;
		const ul = ln(interaction.locale as Locale);
		const options = interaction.options as CommandInteractionOptionResolver;
		const channel = options.getChannel(ul("common.channel"), true);
		if (!channel || !(channel instanceof TextChannel) && !(channel instanceof ThreadChannel)) {
			const oldChan = client.settings.get(interaction.guild.id, "logs");
			client.settings.delete(interaction.guild.id, "logs");
			const msg = oldChan ? ` ${ul("logs.inChan", {chan: channelMention(oldChan)})}` : ".";
			await reply(interaction, { content: `${ul("logs.delete")}${msg}`, ephemeral: true });
			return;
		}
		client.settings.set(interaction.guild.id, channel.id, "logs");
		await reply(interaction, { content: ul("logs.set", {channel: channel.name}), ephemeral: true });
	}
};

export const changeThread = {
	data: new SlashCommandBuilder()
		.setName(t("changeThread.name"))
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
		.setNameLocalizations(cmdLn("changeThread.name"))
		.setDescription(t("changeThread.description"))
		.setDescriptionLocalizations(cmdLn("changeThread.description"))
		.setDMPermission(false)
		.addChannelOption(option =>
			option
				.setName(t("common.channel"))
				.setNameLocalizations(cmdLn("common.channel"))
				.setDescription(t("changeThread.options"))
				.setDescriptionLocalizations(cmdLn("changeThread.options"))
				.setRequired(false)
				.addChannelTypes(ChannelType.GuildText, ChannelType.PublicThread, ChannelType.PrivateThread)
		),
	async execute(interaction: CommandInteraction, client: EClient): Promise<void> {
		const options = interaction.options as CommandInteractionOptionResolver;
		const channel = options.getChannel("channel", true);
		const ul = ln(interaction.locale as Locale);
		if (!interaction.guild) return;
		if (!channel || !(channel instanceof TextChannel) && !(channel instanceof ThreadChannel)) {
			const oldChan = client.settings.get(interaction.guild.id, "rollChannel");
			const msg = oldChan ? ` ${ul("logs.inChan", {chan: channelMention(oldChan)})}` : ".";
			client.settings.delete(interaction.guild.id, "rollChannel");
			await reply(interaction, {content: `${ul("changeThread.delete")}${msg}`, ephemeral: true});
			return;
		}
		client.settings.set(interaction.guild.id, channel.id, "rollChannel");
		await reply(interaction, ul("changeThread.set", {channel: channelMention(channel.id)}));
		return;
	}
};

export const disableThread = {
	data: new SlashCommandBuilder()
		.setName(t("disableThread.name"))
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
		.setNameLocalizations(cmdLn("disableThread.name"))
		.setDescription(t("disableThread.description"))
		.setDescriptionLocalizations(cmdLn("disableThread.description"))
		.setDMPermission(false)
		.addBooleanOption(option =>
			option
				.setName(t("disableThread.options.name"))
				.setNameLocalizations(cmdLn("disableThread.options.name"))
				.setDescription(t("disableThread.options.desc"))
				.setDescriptionLocalizations(cmdLn("disableThread.options.desc"))
				.setRequired(true)
		),
	async execute(interaction: CommandInteraction, client: EClient): Promise<void> {
		const ul = ln(interaction.locale as Locale);
		if (!interaction.guild) return;
		const options = interaction.options as CommandInteractionOptionResolver;
		const toggle = options.getBoolean(t("disableThread.options.name"), true);
		//toggle TRUE = disable thread creation
		//toggle FALSE = enable thread creation
		if (toggle) {
			client.settings.set(interaction.guild.id, true, "disableThread");
			await reply(interaction, ul("disableThread.reply.disable"));
			return;
		}
		client.settings.delete(interaction.guild.id, "disableThread");
		await reply(interaction, ul("disableThread.reply.enable"));
		return;
	}
};