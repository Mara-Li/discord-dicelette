import type { Translation } from "@interface";
import { cmdLn, ln } from "@localization";
import type { EClient } from "@main";
import { reply, title } from "@utils";
import {
	channelMention,
	ChannelType,
	type CommandInteraction,
	type CommandInteractionOptionResolver,
	EmbedBuilder,
	PermissionFlagsBits,
	roleMention,
	SlashCommandBuilder,
	TextChannel,
	ThreadChannel,
} from "discord.js";
import i18next from "i18next";
import { dedent } from "ts-dedent";

const t = i18next.getFixedT("en");
export const configuration = {
	data: new SlashCommandBuilder()
		.setName(t("config.name"))
		.setNameLocalizations(cmdLn("config.name"))
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
		.setDescription(t("config.description"))
		.setDescriptionLocalizations(cmdLn("config.description"))
		/* LOGS */
		.addSubcommand((subcommand) =>
			subcommand
				.setName(t("logs.name"))
				.setNameLocalizations(cmdLn("logs.name"))
				.setDescription(t("logs.description"))
				.setDescriptionLocalizations(cmdLn("logs.description"))
				.setNameLocalizations(cmdLn("logs.name"))
				.addChannelOption((option) =>
					option
						.setName(t("common.channel"))
						.setDescription(t("logs.options"))
						.setDescriptionLocalizations(cmdLn("logs.options"))
						.setNameLocalizations(cmdLn("common.channel"))
						.setRequired(false)
						.addChannelTypes(
							ChannelType.GuildText,
							ChannelType.PrivateThread,
							ChannelType.PublicThread
						)
				)
		)
		/* RESULT CHANNEL */
		.addSubcommand((subcommand) =>
			subcommand
				.setName(t("changeThread.name"))
				.setNameLocalizations(cmdLn("changeThread.name"))
				.setDescription(t("changeThread.description"))
				.setDescriptionLocalizations(cmdLn("changeThread.description"))
				.addChannelOption((option) =>
					option
						.setName(t("common.channel"))
						.setNameLocalizations(cmdLn("common.channel"))
						.setDescription(t("changeThread.options"))
						.setDescriptionLocalizations(cmdLn("changeThread.options"))
						.setRequired(false)
						.addChannelTypes(
							ChannelType.GuildText,
							ChannelType.PublicThread,
							ChannelType.PrivateThread
						)
				)
		)

		/* DELETE AFTER */
		.addSubcommand((subcommand) =>
			subcommand
				.setName(t("timer.name"))
				.setNameLocalizations(cmdLn("timer.name"))
				.setDescription(t("timer.description"))
				.setDescriptionLocalizations(cmdLn("timer.description"))
				.addNumberOption((option) =>
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
		.addSubcommand((subcommand) =>
			subcommand
				.setName(t("disableThread.name"))
				.setNameLocalizations(cmdLn("disableThread.name"))
				.setDescription(t("disableThread.description"))
				.setDescriptionLocalizations(cmdLn("disableThread.description"))
				.addBooleanOption((option) =>
					option
						.setName(t("disableThread.options.name"))
						.setNameLocalizations(cmdLn("disableThread.options.name"))
						.setDescription(t("disableThread.options.desc"))
						.setDescriptionLocalizations(cmdLn("disableThread.options.desc"))
						.setRequired(true)
				)
		)

		/* DISPLAY */
		.addSubcommand((subcommand) =>
			subcommand
				.setName(t("config.display.name"))
				.setNameLocalizations(cmdLn("config.display.name"))
				.setDescription(t("config.display.description"))
				.setDescriptionLocalizations(cmdLn("config.display.description"))
		)
		/* AUTO ROLE */
		.addSubcommandGroup((group) =>
			group
				.setName(t("autoRole.name"))
				.setNameLocalizations(cmdLn("autoRole.name"))
				.setDescription(t("autoRole.description"))
				.setDescriptionLocalizations(cmdLn("autoRole.description"))
				.addSubcommand((subcommand) =>
					subcommand
						.setName(t("common.statistic"))
						.setNameLocalizations(cmdLn("common.statistic"))
						.setDescription(t("autoRole.stat.desc"))
						.setDescriptionLocalizations(cmdLn("autoRole.stat.desc"))
						.addRoleOption((option) =>
							option
								.setName(t("common.role"))
								.setNameLocalizations(cmdLn("common.role"))
								.setDescription(t("autoRole.options"))
								.setDescriptionLocalizations(cmdLn("autoRole.options"))
								.setRequired(false)
						)
				)
				.addSubcommand((subcommand) =>
					subcommand
						.setName(t("common.dice"))
						.setNameLocalizations(cmdLn("common.dice"))
						.setDescription(t("autoRole.dice.desc"))
						.setDescriptionLocalizations(cmdLn("autoRole.dice.desc"))
						.addRoleOption((option) =>
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
		.addSubcommand((sub) =>
			sub
				.setName(t("timestamp.name"))
				.setDescription(t("timestamp.description"))
				.setDescriptionLocalizations(cmdLn("timestamp.description"))
				.setNameLocalizations(cmdLn("timestamp.name"))
				.addBooleanOption((option) =>
					option
						.setName(t("disableThread.options.name"))
						.setDescription(t("timestamp.options"))
						.setRequired(true)
				)
		)
		/* ANCHOR */
		.addSubcommand((sub) =>
			sub
				.setName(t("anchor.name"))
				.setDescription(t("anchor.description"))
				.setDescriptionLocalizations(cmdLn("anchor.description"))
				.setNameLocalizations(cmdLn("anchor.name"))
				.addBooleanOption((option) =>
					option
						.setName(t("disableThread.options.name"))
						.setDescription(t("anchor.options"))
						.setNameLocalizations(cmdLn("disableThread.options.name"))
						.setDescriptionLocalizations(cmdLn("anchor.options"))
						.setRequired(true)
				)
		)
		/**
		 * LOGS IN DICE RESULT
		 * For the result interaction, not the logs
		 */
		.addSubcommand((sub) =>
			sub
				.setName(t("config.logLink.name"))
				.setDescription(t("config.logLink.description"))
				.setDescriptionLocalizations(cmdLn("config.logLink.description"))
				.setNameLocalizations(cmdLn("config.logLink.name"))
				.addBooleanOption((option) =>
					option
						.setName(t("disableThread.options.name"))
						.setDescription(t("linkToLog.options"))
						.setNameLocalizations(cmdLn("disableThread.options.name"))
						.setDescriptionLocalizations(cmdLn("linkToLog.options"))
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
			if (subcommand === t("common.statistic"))
				return stats(options, client, ul, interaction);
			if (subcommand === t("common.dice")) return dice(options, client, ul, interaction);
		}
		switch (subcommand) {
			case t("logs.name"):
				return await logs(interaction, client, ul, options);
			case t("changeThread.name"):
				return await changeThread(interaction, client, ul, options);
			case t("disableThread.name"):
				return await disableThread(interaction, client, ul, options);
			case t("timer.name"):
				return await timer(interaction, client, ul, options);
			case t("config.display.name"):
				return await display(interaction, client, ul);
			case t("timestamp.name"):
				return await timestamp(interaction, client, ul, options);
			case t("anchor.name"):
				return await anchor(interaction, client, ul);
			case t("config.logLink.name"):
				return await linkToLog(interaction, client, ul);
		}
	},
};

function stats(
	options: CommandInteractionOptionResolver,
	client: EClient,
	ul: Translation,
	interaction: CommandInteraction
) {
	const role = options.getRole(t("common.role"));
	if (!role) {
		//remove the role from the db
		client.settings.delete(interaction.guild!.id, "autoRole.stats");
		return reply(interaction, { content: ul("autoRole.stat.remove"), ephemeral: true });
	}
	client.settings.set(interaction.guild!.id, role.id, "autoRole.stats");
	return reply(interaction, {
		content: ul("autoRole.stat.set", { role: roleMention(role.id) }),
		ephemeral: true,
	});
}

function dice(
	options: CommandInteractionOptionResolver,
	client: EClient,
	ul: Translation,
	interaction: CommandInteraction
) {
	const role = options.getRole(t("common.role"));
	if (!role) {
		//remove the role from the db
		client.settings.delete(interaction.guild!.id, "autoRole.dice");
		return reply(interaction, { content: ul("autoRole.dice.remove"), ephemeral: true });
	}
	client.settings.set(interaction.guild!.id, role.id, "autoRole.dice");
	return reply(interaction, {
		content: ul("autoRole.dice.set", { role: roleMention(role.id) }),
		ephemeral: true,
	});
}

async function logs(
	interaction: CommandInteraction,
	client: EClient,
	ul: Translation,
	options: CommandInteractionOptionResolver
) {
	const channel = options.getChannel(ul("common.channel"), true);
	if (
		!channel ||
		(!(channel instanceof TextChannel) && !(channel instanceof ThreadChannel))
	) {
		const oldChan = client.settings.get(interaction.guild!.id, "logs");
		client.settings.delete(interaction.guild!.id, "logs");
		const msg = oldChan
			? ` ${ul("logs.inChan", { chan: channelMention(oldChan) })}`
			: ".";
		await reply(interaction, { content: `${ul("logs.delete")}${msg}`, ephemeral: true });
		return;
	}
	client.settings.set(interaction.guild!.id, channel.id, "logs");
	await reply(interaction, {
		content: ul("logs.set", { channel: channel.name }),
		ephemeral: true,
	});
}

async function changeThread(
	interaction: CommandInteraction,
	client: EClient,
	ul: Translation,
	options: CommandInteractionOptionResolver
) {
	const channel = options.getChannel("channel", true);
	if (!interaction.guild) return;
	if (
		!channel ||
		(!(channel instanceof TextChannel) && !(channel instanceof ThreadChannel))
	) {
		const oldChan = client.settings.get(interaction.guild.id, "rollChannel");
		const msg = oldChan
			? ` ${ul("logs.inChan", { chan: channelMention(oldChan) })}`
			: ".";
		client.settings.delete(interaction.guild.id, "rollChannel");
		await reply(interaction, {
			content: `${ul("changeThread.delete")}${msg}`,
			ephemeral: true,
		});
		return;
	}
	client.settings.set(interaction.guild.id, channel.id, "rollChannel");
	await reply(
		interaction,
		ul("changeThread.set", { channel: channelMention(channel.id) })
	);
	return;
}

async function disableThread(
	interaction: CommandInteraction,
	client: EClient,
	ul: Translation,
	options: CommandInteractionOptionResolver
) {
	const toggle = options.getBoolean(t("disableThread.options.name"), true);
	//toggle TRUE = disable thread creation
	//toggle FALSE = enable thread creation
	const rollChannel = client.settings.get(interaction.guild!.id, "rollChannel");
	if (toggle) {
		client.settings.set(interaction.guild!.id, true, "disableThread");
		if (rollChannel) {
			const mention = `<#${rollChannel}>`;
			const msg =
				ul("disableThread.disable.reply") +
				ul(
					"disableThread.disable.mention",
					{ mention } + ul("disableThread.disable.autoDelete")
				);
			await reply(interaction, msg);
			return;
		}
		await reply(interaction, ul("disableThread.disable.reply"));
		return;
	}
	client.settings.delete(interaction.guild!.id, "disableThread");
	if (rollChannel) {
		const mention = `<#${rollChannel}>`;
		const msg =
			ul("disableThread.enable.reply") + ul("disableThread.enable.mention", { mention });
		await reply(interaction, msg);
		return;
	}
	await reply(interaction, ul("disableThread.enable.reply"));
	return;
}

async function timer(
	interaction: CommandInteraction,
	client: EClient,
	ul: Translation,
	options: CommandInteractionOptionResolver
) {
	if (!interaction.guild) return;
	const timer = options.getNumber(t("timer.option.name"), true);
	client.settings.set(interaction.guild.id, timer * 1000, "deleteAfter");
	if (timer === 0) {
		await interaction.reply({ content: ul("timer.delete", { timer }) });
	} else {
		await interaction.reply({ content: ul("timer.success", { timer }) });
	}
}

async function display(
	interaction: CommandInteraction,
	client: EClient,
	ul: Translation
) {
	const guildSettings = client.settings.get(interaction.guild!.id);
	if (!guildSettings) return;

	const dpTitle = (title?: string) => {
		return `- **__${ul(title)}__**${ul("common.space")}:`;
	};

	const dp = (settings?: string | boolean | number, type?: "role" | "chan") => {
		if (!settings) return ul("common.no");
		if (typeof settings === "boolean") return ul("common.yes");
		if (typeof settings === "number") {
			if (settings === 0 || guildSettings.disableThread) return ul("common.no");
			return `${settings / 1000}s `;
		}
		if (type === "role") return `<@&${settings}>`;
		return `<#${settings}>`;
	};

	const baseEmbed = new EmbedBuilder()
		.setTitle(ul("config.title", { guild: interaction.guild!.name }))
		.setThumbnail(interaction.guild!.iconURL() ?? "")
		.setColor("Random")
		.addFields(
			{
				name: ul("config.logs"),
				value: dedent(`
				${dpTitle("config.admin.title")} ${dp(guildSettings.logs, "chan")}
				 ${ul("config.admin.desc")}
				${dpTitle("config.result.title")} ${dp(guildSettings.rollChannel, "chan")}
				 ${ul("config.result.desc")} 
				${dpTitle("config.disableThread.title")} ${dp(guildSettings.disableThread)}
				 ${ul("config.disableThread.desc")}
			`),
			},
			{
				name: ul("config.sheet"),
				value: dedent(`
					${dpTitle("config.defaultSheet")} ${dp(guildSettings.managerId, "chan")}
					${dpTitle("config.privateChan")} ${dp(guildSettings.privateChannel, "chan")}
					`),
			},
			{
				name: ul("config.displayResult"),
				value: dedent(`
					${dpTitle("config.timestamp.title")} ${dp(guildSettings.timestamp)}
					 ${ul("config.timestamp.desc")}
					${dpTitle("config.timer.title")} ${dp(guildSettings.deleteAfter)}
					 ${ul("config.timer.desc")}
					${dpTitle("config.context.title")} ${dp(guildSettings.context)}
					 ${ul("config.context.desc")}
					${dpTitle("config.linkToLog.title")} ${dp(guildSettings.linkToLogs)}
					 ${ul("config.linkToLog.desc")}
					`),
			},

			{
				name: ul("config.autoRole"),
				value: dedent(`
					${title(dpTitle("common.dice"))} ${dp(guildSettings.autoRole?.dice, "role")}
					${title(dpTitle("common.statistic"))} ${dp(guildSettings.autoRole?.stats, "role")}
				`),
			}
		);
	let templateEmbed: undefined | EmbedBuilder = undefined;
	if (guildSettings.templateID) {
		const templateID = guildSettings.templateID;
		const { channelId, messageId, statsName, damageName } = templateID ?? {};
		if (messageId && messageId.length > 0 && channelId && channelId.length > 0) {
			templateEmbed = new EmbedBuilder()
				.setTitle(ul("config.template"))
				.setColor("Random")
				.setThumbnail(
					"https://github.com/Dicelette/discord-dicelette/blob/main/assets/communication.png?raw=true"
				)
				.addFields({
					name: ul("config.templateMessage"),
					value: `https://discord.com/channels/${interaction.guild!.id}/${channelId}/${messageId}`,
				});

			if (statsName && statsName.length > 0) {
				templateEmbed.addFields({
					name: ul("config.statsName"),
					value: `- ${statsName.join("\n- ")}`,
				});
			}
			if (damageName && damageName.length > 0) {
				templateEmbed.addFields({
					name: ul("config.damageName"),
					value: `- ${damageName.join("\n- ")}`,
				});
			}
		}
	}
	const embeds = [baseEmbed];
	if (templateEmbed) embeds.push(templateEmbed);
	await interaction.reply({ embeds });
}

async function timestamp(
	interaction: CommandInteraction,
	client: EClient,
	ul: Translation,
	options: CommandInteractionOptionResolver
) {
	const toggle = options.getBoolean(t("disableThread.options.name"), true);
	client.settings.set(interaction.guild!.id, toggle, "timestamp");
	if (toggle) {
		await reply(interaction, { content: ul("timestamp.enabled"), ephemeral: true });
	} else {
		await reply(interaction, { content: ul("timestamp.disabled"), ephemeral: true });
	}
}

async function anchor(interaction: CommandInteraction, client: EClient, ul: Translation) {
	const options = interaction.options as CommandInteractionOptionResolver;
	const toggle = options.getBoolean(t("disableThread.options.name"), true);
	client.settings.set(interaction.guild!.id, toggle, "context");
	const deleteLogs = client.settings.get(interaction.guild!.id, "deleteAfter") === 0;
	if (toggle) {
		if (deleteLogs)
			return await reply(interaction, {
				content: ul("anchor.enabled.noDelete"),
				ephemeral: true,
			});
		return await reply(interaction, {
			content: ul("anchor.enabled.logs"),
			ephemeral: true,
		});
	}
	return await reply(interaction, { content: ul("context.disabled"), ephemeral: true });
}

async function linkToLog(
	interaction: CommandInteraction,
	client: EClient,
	ul: Translation
) {
	const options = interaction.options as CommandInteractionOptionResolver;
	const toggle = options.getBoolean(t("disableThread.options.name"), true);
	client.settings.set(interaction.guild!.id, toggle, "linkToLogs");
	if (toggle) {
		return await reply(interaction, {
			content: ul("linkToLog.enabled"),
			ephemeral: true,
		});
	}
	return await reply(interaction, { content: ul("linkToLog.disabled"), ephemeral: true });
}
