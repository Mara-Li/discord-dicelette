import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, CommandInteraction, CommandInteractionOptionResolver, EmbedBuilder, Locale, PermissionFlagsBits, SlashCommandBuilder, TextChannel } from "discord.js";
import fs from "fs";
import removeAccents from "remove-accents";
import dedent from "ts-dedent";

import { Comparator, Statistic, StatisticalTemplate } from "../interface";
import { cmdLn, lError, ln } from "../localizations";
import en from "../localizations/locales/en";
import { title } from "../utils";
import { verifyTemplateValue } from "../utils/verify_template";
import { dmgRoll } from "./dbAtq";
import { rollForUser } from "./dbroll";

type ComparatorSign = ">" | "<" | ">=" | "<=" | "=" | "!=";


export const generateTemplate = {
	data: new SlashCommandBuilder()
		.setName(en.generate.name)
		.setNameLocalizations(cmdLn("generate.name"))
		.setDescription("Generate a template for the statistique command")
		.addStringOption(option =>
			option
				.setName(en.generate.options.stats.name)
				.setNameLocalizations(cmdLn("generate.options.stats.name"))
				.setDescription(en.generate.options.stats.description)
				.setDescriptionLocalizations(cmdLn("generate.options.stats.description"))
				.setRequired(false)
		)

		.addStringOption(option =>
			option
				.setName(en.generate.options.dice.name)
				.setDescription(en.generate.options.dice.description)
				.setDescriptionLocalizations(cmdLn("generate.options.dice.description"))
				.setNameLocalizations(cmdLn("generate.options.dice.name"))
				.setRequired(false)
		)
		.addStringOption(option =>
			option
				.setName(en.generate.options.comparator.name)
				.setDescription(en.generate.options.comparator.description)
				.setDescriptionLocalizations(cmdLn("generate.options.comparator.description"))
				.setNameLocalizations(cmdLn("generate.options.comparator.name"))
				.addChoices({
					"name" : en.generate.options.comparator.value.greater,
					"value" : ">",
					"name_localizations" : cmdLn("generate.options.comparator.value.greater")
				}, {
					"name" : en.generate.options.comparator.value.greaterEqual,
					"value" : ">=",
					"name_localizations" : cmdLn("generate.options.comparator.value.greaterEqual")
				}, {
					"name" : en.generate.options.comparator.value.less,
					"value" : "<",
					"name_localizations" : cmdLn("generate.options.comparator.value.less")
				}, {
					"name" : en.generate.options.comparator.value.lessEqual,
					"name_localizations" : cmdLn("generate.options.comparator.value.lessEqual"),
					"value" : "<=",
				}, {
					"name" : en.generate.options.comparator.value.equal,
					"value" : "=",
					"name_localizations" : cmdLn("generate.options.comparator.value.equal")
				}, {
					"name" : en.generate.options.comparator.value.different,
					"value" : "!=",
					"name_localizations" : cmdLn("generate.options.comparator.value.different")
				})
				.setRequired(false)		
		)
		.addNumberOption(option =>
			option
				.setName(en.generate.options.value.name)
				.setDescription(en.generate.options.value.description)
				.setDescriptionLocalizations(cmdLn("generate.options.value.description"))
				.setNameLocalizations(cmdLn("generate.options.value.name"))
				.setRequired(false)
		)
		.addNumberOption(option =>
			option
				.setName(en.generate.options.total.name)
				.setDescription(en.generate.options.total.description)
				.setDescriptionLocalizations(cmdLn("generate.options.total.description"))
				.setNameLocalizations(cmdLn("generate.options.total.name"))
				.setRequired(false)
		)
		.addBooleanOption(option =>
			option
				.setName(en.generate.options.character.name)
				.setDescription(en.generate.options.character.description)
				.setDescriptionLocalizations(cmdLn("generate.options.character.description"))
				.setNameLocalizations(cmdLn("generate.options.character.name"))
				.setRequired(false)
		)
		.addNumberOption(option =>
			option
				.setName(en.generate.options.critical_success.name)
				.setDescription(en.generate.options.critical_success.description)
				.setDescriptionLocalizations(cmdLn("generate.options.critical_success.description"))
				.setNameLocalizations(cmdLn("generate.options.critical_success.name"))
				.setRequired(false)
		)
		.addNumberOption(option =>
			option
				.setName(en.generate.options.critical_fail.name)
				.setDescription(en.generate.options.critical_fail.description)
				.setRequired(false)
		)
		.addStringOption(option =>
			option
				.setName(en.generate.options.formula.name)
				.setDescription(en.generate.options.formula.description)
				.setDescriptionLocalizations(cmdLn("generate.options.formula.description"))
				.setNameLocalizations(cmdLn("generate.options.formula.name"))
				.setRequired(false)		
		)
		.addStringOption(option =>
			option
				.setName(en.generate.options.damage.name)
				.setDescription(en.generate.options.damage.description)
				.setDescriptionLocalizations(cmdLn("generate.options.damage.description"))
				.setNameLocalizations(cmdLn("generate.options.damage.name"))
				.setRequired(false)
		),
	async execute(interaction: CommandInteraction): Promise<void> {
		if (!interaction.guild) return;
		const options = interaction.options as CommandInteractionOptionResolver;
		const lnOpt=en.generate.options;
		const ul = ln(interaction.locale as Locale);
		const name = options.getString(lnOpt.stats.name) ?? undefined;
		let statServer: Statistic|undefined = undefined;
		if (name){
			const statistiqueName = name.split(/[, ]+/);
			statServer = {};
			for (const stat of statistiqueName ) {
				statServer[removeAccents(stat)] = {
					max: 0,
					min: 0,
					combinaison: ""
				};
			}
		}

		const atqName = options.getString(lnOpt.damage.name);
		let atqDice : {[name: string]: string}|undefined = undefined;
		if (atqName) {
			const atq = atqName.split(/[, ]+/);
			atqDice = {};
			for (const name of atq) {
				atqDice[removeAccents(name)] = "1d5";
			}
		}
		let comparator : Comparator | undefined = {
			sign: options.getString(lnOpt.comparator.name) as ComparatorSign || undefined,
			value: options.getNumber(lnOpt.value.name) ?? undefined,
			formula: options.getString(lnOpt.formula.name) ?? undefined,
			criticalFailure: options.getNumber(lnOpt.critical_fail.name) ?? undefined,
			criticalSuccess: options.getNumber(lnOpt.critical_success.name) ?? undefined
		};
		//verify if everything is undefined in comparator object
		const isUndefined = Object.values(comparator).every(value => value === undefined);
		if (isUndefined) comparator = undefined;

		const statistiqueTemplate: StatisticalTemplate = {
			charName: options.getBoolean(lnOpt.character.name) || false,
			statistics: statServer,
			diceType: options.getString(lnOpt.dice.name) || undefined,
			comparator,
			total: options.getNumber(lnOpt.total.name) || undefined,
			damage: atqDice
		};
		const help = dedent(ul.generate.help);
		await interaction.reply({ content: help, files: [{ attachment: Buffer.from(JSON.stringify(statistiqueTemplate, null, 2), "utf-8"), name: "template.json" }]});
	}
};

export const registerTemplate = {
	data: new SlashCommandBuilder()
		.setName(en.register.name)
		.setNameLocalizations(cmdLn("register.name"))
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
		.setDescription(en.register.description)
		.addChannelOption(option =>
			option
				.setName(en.common.channel)
				.setDescription(en.register.options.channel)
				.setNameLocalizations(cmdLn("common.channel"))
				.setDescriptionLocalizations(cmdLn("register.options.channel"))
				.setRequired(true)
				.addChannelTypes(ChannelType.GuildText)
		)
		.addAttachmentOption(option =>
			option
				.setName(en.register.options.template.name)
				.setDescription(en.register.options.template.description)
				.setNameLocalizations(cmdLn("register.options.template.name"))
				.setDescriptionLocalizations(cmdLn("register.options.template.description"))
				.setRequired(true)
		),
	async execute(interaction: CommandInteraction): Promise<void> {
		if (!interaction.guild) return;
		const options = interaction.options as CommandInteractionOptionResolver;
		const lOpt = en.register.options;
		const ul = ln(interaction.locale as Locale);
		const template = options.getAttachment(lOpt.template.name, true);
		try {
			//fetch the template
			const res = await fetch(template.url).then(res => res.json());
			const templateData = verifyTemplateValue(res);
			const guildData = interaction.guild.id;
			const channel = options.getChannel(ul.common.channel, true);
			if (!(channel instanceof TextChannel)) return;
			//send template as JSON in the channel, send as file
			//add register button
			const button = new ButtonBuilder()
				.setCustomId("register")
				.setLabel(ul.register.button)
				.setStyle(ButtonStyle.Primary);
			const components = new ActionRowBuilder<ButtonBuilder>().addComponents(button);	
			const embedTemplate = new EmbedBuilder()
				.setTitle(ul.register.embed.title)
				.setDescription(ul.register.embed.description)
				.setThumbnail("https://github.com/Lisandra-dev/discord-dicelette-plus/blob/main/assets/template.png?raw=true")
				.setColor("Random");
			
			if (templateData.statistics && (Object.keys(templateData.statistics).length >= 20)) {
				interaction.reply({ content: ul.error.tooMuchStats, ephemeral: true });
				return;
			}
			if (templateData.statistics) {	
				for (const [stat, value] of Object.entries(templateData.statistics)) {
					const min = value.min;
					const max = value.max;
					const combinaison = value.combinaison;
					let msg = "";
					if (combinaison) msg += `- Combinaison${ul.common.space}: \`${combinaison}\`\n`;
					if (min) msg += `- Min${ul.common.space}: \`${min}\`\n`;
					if (max) msg += `- Max${ul.common.space}: \`${max}\`\n`;
					if (msg.length === 0) msg = ul.register.embed.noValue;
					embedTemplate.addFields({
						name: title(stat) ?? "",
						value: msg,
						inline: true,
					});
				}
			}
			if (templateData.diceType)
				embedTemplate.addFields({
					name: ul.register.embed.dice,
					value: templateData.diceType,
				});
			let msgComparator = "";
			if (templateData.comparator) {
				if (templateData.comparator.value) msgComparator += `- ${ul.register.embed.value} \`${templateData.comparator.value}\`\n`;
				if (templateData.comparator.formula) msgComparator += `- ${ul.register.embed.formula} \`${templateData.comparator.formula}\`\n`;
				if (templateData.comparator.sign) msgComparator += `- ${ul.register.embed.comparator} \`${templateData.comparator.sign}\`\n`;
				embedTemplate.addFields({
					name: ul.register.embed.comparator,
					value: msgComparator,
				});
			}
			if (templateData.total) embedTemplate.addFields({
				name: ul.common.total,
				value: `${ul.common.total}${ul.common.space}: ${templateData.total}`,
			});
			if (templateData.damage) {
				const damage = Object.entries(templateData.damage).map(([name, value]) => `- ${name} : ${value}`).join("\n");
				embedTemplate.addFields({
					name: ul.register.embed.damage,
					value: damage,
				});
			}
			const msg = await channel.send({ content: "", embeds: [embedTemplate], files: [{ attachment: Buffer.from(JSON.stringify(templateData, null, 2), "utf-8"), name: "template.json" }], components: [components]});
			msg.pin();
			await interaction.reply({ content: ul.register.embed.registered, ephemeral: true });
			//save in database file
			const data = fs.readFileSync("database.json", "utf-8");
			const json = JSON.parse(data);
			const statsName = templateData.statistics ? Object.keys(templateData.statistics) : undefined;
			const damageName = templateData.damage ? Object.keys(templateData.damage) : undefined;
			if (json[guildData]) {
				if (json[guildData].templateID.messageId && json[guildData].templateID.channelId) {
					try {
						const channel = await interaction.guild.channels.fetch(json[guildData].templateID.channelId);
						const msg = await (channel as TextChannel).messages.fetch(json[guildData].templateID.messageId);
						await msg.delete();
					} catch (e) {
						//ignore
					}
				}
				json[guildData].templateID = {
					channelId: channel.id,
					messageId: msg.id,
					statsName,
					damageName
				};
			} else {
				json[guildData] = {
					templateID: {
						channelId: channel.id,
						messageId: msg.id,
						statsName,
						damageName
					},
					user: {}
				};
			}
			fs.writeFileSync("database.json", JSON.stringify(json, null, 2), "utf-8");
		} catch (e) {
			console.log(e);
			const translationError = lError((e as Error), interaction);
			await interaction.reply({ content: `${ul.error.invalid}\`\`\`\n${translationError}\`\`\``, ephemeral: true });
		}
	}	
};

export const logs = {
	data: new SlashCommandBuilder()
		.setName(en.logs.name)
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
		.setDescription(en.logs.description)
		.setDescriptionLocalizations(cmdLn("logs.description"))
		.setNameLocalizations(cmdLn("logs.name"))
		.addChannelOption(option =>
			option
				.setName(en.common.channel)
				.setDescription(en.logs.options)
				.setDescriptionLocalizations(cmdLn("logs.options"))
				.setNameLocalizations(cmdLn("common.channel"))
				.setRequired(true)
				.addChannelTypes(ChannelType.GuildText, ChannelType.PrivateThread, ChannelType.PublicThread)
		),
	async execute(interaction: CommandInteraction): Promise<void> {
		if (!interaction.guild) return;
		const ul = ln(interaction.locale as Locale);
		const options = interaction.options as CommandInteractionOptionResolver;
		const channel = options.getChannel(ul.common.channel, true);
		if (!channel || !(channel instanceof TextChannel)) return;
		const data = fs.readFileSync("database.json", "utf-8");
		const json = JSON.parse(data);
		const guildData = interaction.guild.id;
		json[guildData].logs = channel.id;
		fs.writeFileSync("database.json", JSON.stringify(json, null, 2), "utf-8");
		await interaction.reply({ content:ul.logs.set(channel.name), ephemeral: true });
	}
};

export const commands = [generateTemplate, registerTemplate, rollForUser, logs, dmgRoll];