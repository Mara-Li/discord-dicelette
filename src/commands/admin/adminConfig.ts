import { Translation } from "@interface";
import { cmdLn, ln } from "@localization";
import { EClient } from "@main";
import { reply } from "@utils";
import { channelMention, ChannelType, CommandInteraction, CommandInteractionOptionResolver, EmbedBuilder, PermissionFlagsBits,roleMention,SlashCommandBuilder, TextChannel, ThreadChannel } from "discord.js";
import i18next from "i18next";
import { Locale } from "moment";


const t = i18next.getFixedT("en");
export const adminConfig = {
	data: new SlashCommandBuilder()
		.setName(t("config.name"))
		.setNameLocalizations(cmdLn("config.name"))
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
		.setDescription(t("config.description"))
		.setDescriptionLocalizations(cmdLn("config.description"))
		/* LOGS */
		.addSubcommand(subcommand =>
			subcommand
				.setName(t("logs.name"))
				.setNameLocalizations(cmdLn("logs.name"))
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
				)
		)
		/* RESULT CHANNEL */
		.addSubcommand(subcommand =>
			subcommand
				.setName(t("changeThread.name"))
				.setNameLocalizations(cmdLn("changeThread.name"))
				.setDescription(t("changeThread.description"))
				.setDescriptionLocalizations(cmdLn("changeThread.description"))
				.addChannelOption(option =>
					option
						.setName(t("common.channel"))
						.setNameLocalizations(cmdLn("common.channel"))
						.setDescription(t("changeThread.options"))
						.setDescriptionLocalizations(cmdLn("changeThread.options"))
						.setRequired(false)
						.addChannelTypes(ChannelType.GuildText, ChannelType.PublicThread, ChannelType.PrivateThread)
				)
		)
		
		
		/* DELETE AFTER */
		.addSubcommand(subcommand =>
			subcommand
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
				)
		)
		
		/* DISABLE THREAD */
		.addSubcommand(subcommand =>
			subcommand
				.setName(t("disableThread.name"))
				.setNameLocalizations(cmdLn("disableThread.name"))
				.setDescription(t("disableThread.description"))
				.setDescriptionLocalizations(cmdLn("disableThread.description"))
				.addBooleanOption(option =>
					option
						.setName(t("disableThread.options.name"))
						.setNameLocalizations(cmdLn("disableThread.options.name"))
						.setDescription(t("disableThread.options.desc"))
						.setDescriptionLocalizations(cmdLn("disableThread.options.desc"))
						.setRequired(true)
				)
		)

		/* DISPLAY */
		.addSubcommand(subcommand =>
			subcommand
				.setName(t("config.display.name"))
				.setNameLocalizations(cmdLn("config.display.name"))
				.setDescription(t("config.display.description"))
				.setDescriptionLocalizations(cmdLn("config.display.description")),
		)
		/* AUTO ROLE */
		.addSubcommandGroup(group =>
			group
				.setName(t("autoRole.name"))
				.setNameLocalizations(cmdLn("autoRole.name"))
				.setDescription(t("autoRole.description"))
				.setDescriptionLocalizations(cmdLn("autoRole.description"))
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
						.setDescriptionLocalizations(cmdLn("autoRole.dice.desc"))
						.addRoleOption(option =>
							option
								.setName(t("common.role"))
								.setNameLocalizations(cmdLn("common.role"))
								.setDescription(t("autoRole.options"))
								.setDescriptionLocalizations(cmdLn("autoRole.options"))
								.setRequired(false)
						)
				) 
		)

		/* TIMESTAMP */
		.addSubcommand(sub => 
			sub
				.setName(t("timestamp.name"))
				.setDescription(t("timestamp.description"))
				.setDescriptionLocalizations(cmdLn("timestamp.description"))
				.setNameLocalizations(cmdLn("timestamp.name"))
				.addBooleanOption(option => 
					option
						.setName(t("disableThread.options.name"))
						.setDescription(t("timestamp.options"))
						.setRequired(true)
				)
		
		),
	async execute(interaction: CommandInteraction, client: EClient) {
		if (!interaction.guild) return;
		const ul = ln(interaction.locale);
		const options = interaction.options as CommandInteractionOptionResolver;
		const subcommand = options.getSubcommand(true);
		const subcommandGroup = options.getSubcommandGroup();
		if (subcommandGroup && subcommandGroup === t("autoRole.name")) {
			if (subcommand === t("common.statistic")) return stats(options, client, ul, interaction);
			else if (subcommand === t("common.dice")) return dice(options, client, ul, interaction);
		}
		switch (subcommand) {
		case t("logs.name"):
			return await logs(interaction, client, ul, options);
		case (t("changeThread.name")):
			return await changeThread(interaction, client, ul, options);
		case t("disableThread.name"):
			return await disableThread(interaction, client, ul, options);
		case t("timer.name"):
			return await timer(interaction, client, ul, options);
		case t("config.display.name"):
			return await display(interaction, client, ul);
		case t("timestamp.name"):
			return await timestamp(interaction, client, ul, options);
		}
	},
};

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

async function logs(interaction: CommandInteraction, client: EClient, ul: Translation, options: CommandInteractionOptionResolver) {
	const channel = options.getChannel(ul("common.channel"), true);
	if (!channel || !(channel instanceof TextChannel) && !(channel instanceof ThreadChannel)) {
		const oldChan = client.settings.get(interaction.guild!.id, "logs");
		client.settings.delete(interaction.guild!.id, "logs");
		const msg = oldChan ? ` ${ul("logs.inChan", {chan: channelMention(oldChan)})}` : ".";
		await reply(interaction, { content: `${ul("logs.delete")}${msg}`, ephemeral: true });
		return;
	}
	client.settings.set(interaction.guild!.id, channel.id, "logs");
	await reply(interaction, { content: ul("logs.set", {channel: channel.name}), ephemeral: true });
}

async function changeThread(interaction: CommandInteraction, client: EClient, ul: Translation, options: CommandInteractionOptionResolver) {
	const channel = options.getChannel("channel", true);
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

async function disableThread(interaction: CommandInteraction, client: EClient, ul: Translation, options: CommandInteractionOptionResolver) {
	const toggle = options.getBoolean(t("disableThread.options.name"), true);
	//toggle TRUE = disable thread creation
	//toggle FALSE = enable thread creation
	const rollChannel = client.settings.get(interaction.guild!.id, "rollChannel");
	if (toggle) {
		client.settings.set(interaction.guild!.id, true, "disableThread");
		if (rollChannel) {
			const mention = `<#${rollChannel}>`;
			const msg = ul("disableThread.disable.reply") + ul("disableThread.disable.mention", {mention});
			await reply(interaction, msg);
			return;
		}
		await reply(interaction, ul("disableThread.disable.reply"));
		return;
	}
	client.settings.delete(interaction.guild!.id, "disableThread");
	if (rollChannel) {
		const mention = `<#${rollChannel}>`;
		const msg = ul("disableThread.enable.reply") + ul("disableThread.enable.mention", {mention});
		await reply(interaction, msg);
		return;
	}
	await reply(interaction, ul("disableThread.enable.reply"));
	return;
}

async function timer(interaction: CommandInteraction, client: EClient, ul: Translation, options: CommandInteractionOptionResolver) {
	if (!interaction.guild) return;
	const timer = options.getNumber(t("timer.option.name"), true);
	client.settings.set(interaction.guild.id, timer * 1000, "deleteAfter");
	if (timer === 0) {
		await interaction.reply({ content: ul("timer.delete", { timer }) });
	} else {
		await interaction.reply({ content: ul("timer.success", { timer }) });
	}
}

async function display(interaction: CommandInteraction, client: EClient, ul: Translation) {
	const timer = client.settings.get(interaction.guild!.id, "deleteAfter");
	const logs = client.settings.get(interaction.guild!.id, "logs");
	const rollChannel = client.settings.get(interaction.guild!.id, "rollChannel");
	const disableThread = client.settings.get(interaction.guild!.id, "disableThread");
	const autoRole = client.settings.get(interaction.guild!.id, "autoRole");
	const managerId = client.settings.get(interaction.guild!.id, "managerId");
	const privateChan = client.settings.get(interaction.guild!.id, "privateChannel");
	const timestamp = client.settings.get(interaction.guild!.id, "timestamp");
	const baseEmbed = new EmbedBuilder()
		.setTitle(ul("config.title",{ guild: interaction.guild!.name}))
		.setThumbnail(interaction.guild!.iconURL() ?? "")
		.setColor("Random");
	if (timer) {
		baseEmbed.addFields({
			name: ul("config.timer"),
			value: `${timer / 1000}s`,
		});
	}
	if (timestamp) {
		baseEmbed.addFields({
			name: ul("config.timestamp"),
			value: "_ _",
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
			value: "_ _",
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
	if (privateChan) {
		baseEmbed.addFields({
			name: ul("config.privateChan"),
			value: `<#${privateChan}>`,
		});
	}

	if (client.settings.has(interaction.guild!.id, "templateID")) {
		const templateID = client.settings.get(interaction.guild!.id, "templateID");
		const { channelId, messageId, statsName, damageName } = templateID ?? {};
		if (messageId && messageId.length > 0 && channelId && channelId.length > 0){
			const messageLink = `https://discord.com/channels/${interaction.guild!.id}/${channelId}/${messageId}`;
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
}

async function timestamp(interaction: CommandInteraction, client: EClient, ul: Translation, options: CommandInteractionOptionResolver) {
	const toggle = options.getBoolean(t("disableThread.options.name"), true);
	client.settings.set(interaction.guild!.id, toggle, "timestamp");
	if (toggle) {
		await reply(interaction, { content: ul("timestamp.enabled"), ephemeral: true });
	} else {
		await reply(interaction, { content: ul("timestamp.disabled"), ephemeral: true });
	}
}