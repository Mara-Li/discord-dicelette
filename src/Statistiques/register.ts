/**
 * TODO:
 * - Register USER
 * - Parse dice ie:
 * 	Transform this: /r <characters> <statistique> [<bonus/malus> <comments>]
 * 	Into: /r <defaultDice><usagestats><comparesign><valuecompare> []
 * 		ie: /r 1d20+statistiqueValue<=X []
 * 		or: /r 1d20<=statistiqueValue []
 */
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, CommandInteraction, CommandInteractionOptionResolver, EmbedBuilder, Locale, PermissionFlagsBits, SlashCommandBuilder, TextChannel } from "discord.js";
import fs from "fs";
import removeAccents from "remove-accents";
import dedent from "ts-dedent";

import { Statistique, StatistiqueTemplate } from "../interface";
import { cmdLn, ln } from "../localizations";
import en from "../localizations/locales/en";
import { rollForUser } from "./roll";
import { title,verifyTemplateValue } from "./utils";

type ComparatorSign = ">" | "<" | ">=" | "<=" | "=" | "!=";


export const generateTemplate = {
	data: new SlashCommandBuilder()
		.setName(en.generate.name)
		.setNameLocalizations(cmdLn("register.name"))
		.setDescription("Generate a template for the statistique command")
		.addStringOption(option =>
			option
				.setName(en.generate.options.stats.name)
				.setNameLocalizations(cmdLn("register.options.stats.name"))
				.setDescription(en.generate.options.stats.description)
				.setDescriptionLocalizations(cmdLn("register.options.stats.description"))
				.setRequired(true)
		)

		.addStringOption(option =>
			option
				.setName(en.generate.options.dice.name)
				.setDescription(en.generate.options.dice.description)
				.setDescriptionLocalizations(cmdLn("register.options.dice.description"))
				.setNameLocalizations(cmdLn("register.options.dice.name"))
				.setRequired(true)
		)
		.addStringOption(option =>
			option
				.setName(en.generate.options.comparator.name)
				.setDescription(en.generate.options.comparator.description)
				.setDescriptionLocalizations(cmdLn("register.options.comparator.description"))
				.setNameLocalizations(cmdLn("register.options.comparator.name"))
				.addChoices({
					"name" : en.generate.options.comparator.value.greater,
					"name_localizations" : cmdLn("register.options.comparator.value.greater"),
					"value" : ">",
				}, {
					"name" : en.generate.options.comparator.value.greaterEqual,
					"name_localizations" : cmdLn("register.options.comparator.value.greaterEqual"),
					"value" : ">=",
				}, {
					"name" : en.generate.options.comparator.value.less,
					"name_localizations" : cmdLn("register.options.comparator.value.less"),
					"value" : "<",
				}, {
					"name" : en.generate.options.comparator.value.lessEqual,
					"name_localizations" : cmdLn("register.options.comparator.value.lessEqual"),
					"value" : "<=",
				}, {
					"name" : en.generate.options.comparator.value.equal,
					"name_localizations" : cmdLn("register.options.comparator.value.equal"),
					"value" : "=",
				}, {
					"name" : en.generate.options.comparator.value.different,
					"name_localizations" : cmdLn("register.options.comparator.value.different"),
					"value" : "!=",
				})
				.setRequired(true)		
		)
		.addNumberOption(option =>
			option
				.setName(en.generate.options.value.name)
				.setDescription(en.generate.options.value.description)
				.setDescriptionLocalizations(cmdLn("register.options.value.description"))
				.setNameLocalizations(cmdLn("register.options.value.name"))
				.setRequired(false)
		)
		.addNumberOption(option =>
			option
				.setName(en.generate.options.total.name)
				.setDescription(en.generate.options.total.description)
				.setDescriptionLocalizations(cmdLn("register.options.total.description"))
				.setNameLocalizations(cmdLn("register.options.total.name"))
				.setRequired(false)
		)
		.addBooleanOption(option =>
			option
				.setName(en.generate.options.character.name)
				.setDescription(en.generate.options.character.description)
				.setDescriptionLocalizations(cmdLn("register.options.character.description"))
				.setNameLocalizations(cmdLn("register.options.character.name"))
				.setRequired(false)
		)
		.addNumberOption(option =>
			option
				.setName(en.generate.options.critical_success.name)
				.setDescription(en.generate.options.critical_success.description)
				.setDescriptionLocalizations(cmdLn("register.options.critical_success.description"))
				.setNameLocalizations(cmdLn("register.options.critical_success.name"))
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
				.setDescriptionLocalizations(cmdLn("register.options.formula.description"))
				.setNameLocalizations(cmdLn("register.options.formula.name"))
				.setRequired(false)		
		),
	async execute(interaction: CommandInteraction): Promise<void> {
		if (!interaction.guild) return;
		const options = interaction.options as CommandInteractionOptionResolver;
		const lnOpt=en.generate.options;
		const ul = ln(interaction.locale as Locale);
		const name = options.getString(lnOpt.stats.name);
		if (!name) return;
		const statistiqueName = name.split(/[, ]+/);
		const statServer: Statistique = {};
		for (const stat of statistiqueName ) {
			statServer[removeAccents(stat)] = {
				max: 0,
				min: 0,
				combinaison: ""
			};
		}
		const statistiqueTemplate: StatistiqueTemplate = {
			charName: options.getBoolean(lnOpt.character.name) || false,
			statistiques: statServer,
			diceType: options.getString(lnOpt.dice.name) || "1d20",
			comparator: {
				sign: options.getString(lnOpt.comparator.name) as ComparatorSign || ">",
				value: options.getNumber(lnOpt.value.name) || undefined,
				formula: options.getString(lnOpt.formula.name) || "",
				criticalFailure: options.getNumber(lnOpt.critical_fail.name) || 1,
				criticalSuccess: options.getNumber(lnOpt.critical_success.name) || 20
			},
			total: options.getNumber(lnOpt.total.name) || 0,
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
				.setName(en.register.options.channel.name)
				.setDescription(en.register.options.channel.description)
				.setNameLocalizations(cmdLn("register.options.channel.name"))
				.setDescriptionLocalizations(cmdLn("register.options.channel.description"))
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
		const template = options.getAttachment(lOpt.template.name);
		if (!template) return;
		try {
			//fetch the template
			const res = await fetch(template.url).then(res => res.json());
			const templateData = verifyTemplateValue(res);
			const guildData = interaction.guild.id;
			const channel = options.getChannel(lOpt.channel.name);
			if (!channel || !(channel instanceof TextChannel)) return;
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
			if (Object.keys(templateData.statistiques).length === 0) {
				interaction.reply({ content: ul.register.error.noStatistics, ephemeral: true });
				return;
			}
			if (Object.keys(templateData.statistiques).length >= 20) {
				interaction.reply({ content: ul.register.error.tooMuchStats, ephemeral: true });
				return;
			}
				
			for (const [stat, value] of Object.entries(templateData.statistiques)) {
				const min = value.min;
				const max = value.max;
				const combinaison = value.combinaison;
				let msg = "";
				if (combinaison) msg += `- Combinaison: \`${combinaison}\`\n`;
				if (min) msg += `- Min: \`${min}\`\n`;
				if (max) msg += `- Max: \`${max}\`\n`;
				if (msg.length === 0) msg = ul.register.embed.noValue;
				embedTemplate.addFields({
					name:title(stat),
					value: msg,
					inline: true,
				});
			}
			//add the last embed
			embedTemplate.addFields({
				name: ul.register.embed.dice,
				value: templateData.diceType,
			});
			let msgComparator = "";
			if (templateData.comparator.value) msgComparator += `- ${ul.register.embed.value} \`${templateData.comparator.value}\`\n`;
			if (templateData.comparator.formula) msgComparator += `- ${ul.register.embed.formula} \`${templateData.comparator.formula}\`\n`;
			if (templateData.comparator.sign) msgComparator += `- ${ul.register.embed.comparator}: \`${templateData.comparator.sign}\`\n`;
			embedTemplate.addFields({
				name: ul.register.embed.comparator,
				value: msgComparator,
			});
			if (templateData.total) embedTemplate.addFields({
				name: ul.common.total,
				value: `${ul.common.total}${ul.common.space}: ${templateData.total}`,
			});
			const msg = await channel.send({ content: "", embeds: [embedTemplate], files: [{ attachment: Buffer.from(JSON.stringify(templateData, null, 2), "utf-8"), name: "template.json" }], components: [components]});
			msg.pin();
			await interaction.reply({ content: ul.register.embed.registered, ephemeral: true });
			//save in database file
			const data = fs.readFileSync("database.json", "utf-8");
			const json = JSON.parse(data);
			const statsName = Object.keys(templateData.statistiques);
			if (json[guildData]) {
				json[guildData].templateID = {
					channelId: channel.id,
					messageId: msg.id,
					statsName
				};
			} else {
				json[guildData] = {
					templateID: {
						channelId: channel.id,
						messageId: msg.id,
						statsName
					},
					user: [{}]
				};
			}
			fs.writeFileSync("database.json", JSON.stringify(json, null, 2), "utf-8");
		} catch (e) {
			console.log(e);
			await interaction.reply({ content: `${ul.register.error.invalid}:\n \`\`\`\n${(e as Error).message}\`\`\``, ephemeral: true });
		}
	}	
};


export const commands = [generateTemplate, registerTemplate, rollForUser];