import { Critical, Statistic, StatisticalTemplate } from "@core/interface";
import { verifyTemplateValue } from "@core/verify_template";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, channelMention,ChannelType, CommandInteraction, CommandInteractionOptionResolver, EmbedBuilder, Locale, PermissionFlagsBits, SlashCommandBuilder, TextChannel, ThreadChannel } from "discord.js";
import fs from "fs";
import dedent from "ts-dedent";

import { cmdLn, ln } from "../localizations";
import { default as i18next } from "../localizations/i18next";
import { title } from "../utils";
import { bulkEditTemplateUser } from "../utils/parse";

const t = i18next.getFixedT("en");

export const generateTemplate = {
	data: new SlashCommandBuilder()
		.setName(t("generate.name"))
		.setNameLocalizations(cmdLn("generate.name"))
		.setDescription("Generate a template for the statistique command")
		.addStringOption(option =>
			option
				.setName(t("generate.options.stats.name"))
				.setNameLocalizations(cmdLn("generate.options.stats.name"))
				.setDescription(t("generate.options.stats.description"))
				.setDescriptionLocalizations(cmdLn("generate.options.stats.description"))
				.setRequired(false)
		)

		.addStringOption(option =>
			option
				.setName(t("generate.options.dice.name"))
				.setDescription(t("generate.options.dice.description"))
				.setDescriptionLocalizations(cmdLn("generate.options.dice.description"))
				.setNameLocalizations(cmdLn("generate.options.dice.name"))
				.setRequired(false)
		)
		
		.addNumberOption(option =>
			option
				.setName(t("generate.options.total.name"))
				.setDescription(t("generate.options.total.description"))
				.setDescriptionLocalizations(cmdLn("generate.options.total.description"))
				.setNameLocalizations(cmdLn("generate.options.total.name"))
				.setRequired(false)
		)
		.addBooleanOption(option =>
			option
				.setName(t("generate.options.character.name"))
				.setDescription(t("generate.options.character.description"))
				.setDescriptionLocalizations(cmdLn("generate.options.character.description"))
				.setNameLocalizations(cmdLn("generate.options.character.name"))
				.setRequired(false)
		)
		.addNumberOption(option =>
			option
				.setName(t("generate.options.critical_success.name"))
				.setDescription(t("generate.options.critical_success.description"))
				.setDescriptionLocalizations(cmdLn("generate.options.critical_success.description"))
				.setNameLocalizations(cmdLn("generate.options.critical_success.name"))
				.setRequired(false)
		)
		.addNumberOption(option =>
			option
				.setName(t("generate.options.critical_fail.name"))
				.setNameLocalizations(cmdLn("generate.options.critical_fail.name"))
				.setDescription(t("generate.options.critical_fail.description"))
				.setDescriptionLocalizations(cmdLn("generate.options.critical_fail.description"))
				.setRequired(false)
		)
		.addStringOption(option =>
			option
				.setName(t("generate.options.damage.name"))
				.setDescription(t("generate.options.damage.description"))
				.setDescriptionLocalizations(cmdLn("generate.options.damage.description"))
				.setNameLocalizations(cmdLn("generate.options.damage.name"))
				.setRequired(false)
		),
	async execute(interaction: CommandInteraction): Promise<void> {
		if (!interaction.guild) return;
		const options = interaction.options as CommandInteractionOptionResolver;
		const ul = ln(interaction.locale as Locale);
		const name = options.getString(t("generate.options.stats.name")) ?? undefined;
		let statServer: Statistic|undefined = undefined;
		if (name){
			const statistiqueName = name.split(/[, ]+/);
			statServer = {};
			for (const stat of statistiqueName ) {
				statServer[stat] = {
					max: 0,
					min: 0,
					combinaison: ""
				};
			}
		}

		const atqName = options.getString(t("generate.options.damage.name"));
		let atqDice : {[name: string]: string}|undefined = undefined;
		if (atqName) {
			const atq = atqName.split(/[, ]+/);
			atqDice = {};
			for (const name of atq) {
				atqDice[name] = "1d5";
			}
		}
		let critical : Critical | undefined = {
			failure: options.getNumber(t("generate.options.critical_fail.name")) ?? undefined,
			success: options.getNumber(t("generate.options.critical_success.name")) ?? undefined
		};
		//verify if everything is undefined in comparator object
		const isUndefined = Object.values(critical).every(value => value === undefined);
		if (isUndefined) critical = undefined;

		const statistiqueTemplate: StatisticalTemplate = {
			charName: options.getBoolean(t("generate.options.character.name")) || false,
			statistics: statServer,
			diceType: options.getString(t("generate.options.dice.name")) || undefined,
			critical,
			total: options.getNumber(t("generate.options.total.name")) || undefined,
			damage: atqDice
		};
		const help = dedent(ul("generate.help"));
		await interaction.reply({ content: help, files: [{ attachment: Buffer.from(JSON.stringify(statistiqueTemplate, null, 2), "utf-8"), name: "template.json" }]});
	}
};

export const registerTemplate = {
	data: new SlashCommandBuilder()
		.setName(t("register.name"))
		.setNameLocalizations(cmdLn("register.name"))
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
		.setDescription(t("register.description"))
		.addChannelOption(option =>
			option
				.setName(t("common.channel"))
				.setDescription(t("register.options.channel"))
				.setNameLocalizations(cmdLn("common.channel"))
				.setDescriptionLocalizations(cmdLn("register.options.channel"))
				.setRequired(true)
				.addChannelTypes(ChannelType.PublicThread, ChannelType.GuildText, ChannelType.PrivateThread)
		)
		.addAttachmentOption(option =>
			option
				.setName(t("register.options.template.name"))
				.setDescription(t("register.options.template.description"))
				.setNameLocalizations(cmdLn("register.options.template.name"))
				.setDescriptionLocalizations(cmdLn("register.options.template.description"))
				.setRequired(true)
		)
		.addChannelOption(option =>
			option
				.setName(t("register.options.userChan.name"))
				.setDescription(t("register.options.userChan.description"))
				.setNameLocalizations(cmdLn("register.options.userChan.name"))
				.setDescriptionLocalizations(cmdLn("register.options.userChan.description"))
				.setRequired(false)
				.addChannelTypes(ChannelType.PublicThread, ChannelType.GuildText, ChannelType.PrivateThread)
		),
	async execute(interaction: CommandInteraction): Promise<void> {
		if (!interaction.guild) return;
		const options = interaction.options as CommandInteractionOptionResolver;
		const ul = ln(interaction.locale as Locale);
		const template = options.getAttachment(t("register.options.template.name"), true);
		//fetch the template
		const res = await fetch(template.url).then(res => res.json());
		const templateData = verifyTemplateValue(res);
		const guildData = interaction.guild.id;
		const channel = options.getChannel(ul("common.channel"), true);
		const userChan = options.getChannel(ul("register.options.userChan.name"), false);
		if (
			(!(channel instanceof TextChannel) && (!(channel instanceof ThreadChannel))) || 
			(!userChan && !(channel instanceof TextChannel))
		) {
			await interaction.reply({ content: ul("error.userChan", {chan: channelMention(channel.id)}), ephemeral: true });
			return;
		}
		
		const button = new ButtonBuilder()
			.setCustomId("register")
			.setLabel(ul("register.button"))
			.setStyle(ButtonStyle.Primary);
		const components = new ActionRowBuilder<ButtonBuilder>().addComponents(button);	
		const embedTemplate = new EmbedBuilder()
			.setTitle(ul("register.embed.title"))
			.setDescription(ul("register.embed.description"))
			.setThumbnail("https://github.com/Lisandra-dev/discord-dicelette-plus/blob/main/assets/template.png?raw=true")
			.setColor("Random");
			
		if (templateData.statistics && (Object.keys(templateData.statistics).length >= 20)) {
			interaction.reply({ content: ul("error.tooMuchStats"), ephemeral: true });
			return;
		}
		if (templateData.statistics) {	
			for (const [stat, value] of Object.entries(templateData.statistics)) {
				const min = value.min;
				const max = value.max;
				const combinaison = value.combinaison;
				let msg = "";
				if (combinaison) msg += `- Combinaison${ul("common.space")}: \`${combinaison}\`\n`;
				if (min) msg += `- Min${ul("common.space")}: \`${min}\`\n`;
				if (max) msg += `- Max${ul("common.space")}: \`${max}\`\n`;
				if (msg.length === 0) msg = ul("register.embed.noValue");
				embedTemplate.addFields({
					name: title(stat),
					value: msg,
					inline: true,
				});
			}
		}
		if (templateData.diceType)
			embedTemplate.addFields({
				name: ul("common.dice"),
				value: `\`${templateData.diceType}\``,
			});
		let msgComparator = "";
		if (templateData.critical) {
			if (templateData.critical.success) msgComparator += `- ${ul("roll.critical.success")}${ul("common.space")}: \`${templateData.critical.success}\`\n`;
			if (templateData.critical.failure) msgComparator += `- ${ul("roll.critical.failure")}${ul("common.space")}: \`${templateData.critical.failure}\`\n`;
			embedTemplate.addFields({
				name: ul("register.embed.comparator"),
				value: msgComparator,
			});
		}
		if (templateData.total) embedTemplate.addFields({
			name: ul("common.total"),
			value: `${ul("common.total")}${ul("common.space")}: \`${templateData.total}\``,
		});
		if (templateData.damage) {
			const damage = Object.entries(templateData.damage).map(([name, value]) => `- ${name} : ${value}`).join("\n");
			embedTemplate.addFields({
				name: ul("register.embed.damage"),
				value: damage,
			});
		}
		const msg = await channel.send({ content: "", embeds: [embedTemplate], files: [{ attachment: Buffer.from(JSON.stringify(templateData, null, 2), "utf-8"), name: "template.json" }], components: [components]});
		msg.pin();
		await interaction.reply({ content: ul("register.embed.registered"), ephemeral: true });
		//save in database file
		const data = fs.readFileSync("database.json", "utf-8");
		const json = JSON.parse(data);
		const statsName = templateData.statistics ? Object.keys(templateData.statistics) : undefined;
		const damageName = templateData.damage ? Object.keys(templateData.damage) : undefined;
		if (json[guildData]) {
			if (json[guildData]?.templateID?.messageId && json?.[guildData]?.templateID?.channelId) {
				try {
					const channel = await interaction.guild.channels.fetch(json[guildData].templateID.channelId);
					const msg = await (channel as TextChannel).messages.fetch(json[guildData].templateID.messageId);
					await msg.delete();
				} catch (e) {
					console.error(e);
				}
			}
			json[guildData].templateID = {
				channelId: channel.id,
				messageId: msg.id,
				statsName,
				damageName
			};
			if (userChan) {
				json[guildData].managerId = userChan.id;
			}
		} else {
			json[guildData] = {
				templateID: {
					channelId: channel.id,
					messageId: msg.id,
					managerId: userChan?.id,
					statsName,
					damageName
				},
				user: {}
			};
		}
		await bulkEditTemplateUser(json[guildData], interaction, ul, templateData);
		fs.writeFileSync("database.json", JSON.stringify(json, null, 2), "utf-8");
	}	
};

export const logs = {
	data: new SlashCommandBuilder()
		.setName(t("logs.name"))
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
				.setRequired(true)
				.addChannelTypes(ChannelType.GuildText, ChannelType.PrivateThread, ChannelType.PublicThread)
		),
	async execute(interaction: CommandInteraction): Promise<void> {
		if (!interaction.guild) return;
		const ul = ln(interaction.locale as Locale);
		const options = interaction.options as CommandInteractionOptionResolver;
		const channel = options.getChannel(ul("common.channel"), true);
		if (!channel || !(channel instanceof TextChannel)) return;
		const data = fs.readFileSync("database.json", "utf-8");
		const json = JSON.parse(data);
		const guildData = interaction.guild.id;
		json[guildData].logs = channel.id;
		fs.writeFileSync("database.json", JSON.stringify(json, null, 2), "utf-8");
		await interaction.reply({ content: ul("logs.set", {channel: channel.name}), ephemeral: true });
	}
};

