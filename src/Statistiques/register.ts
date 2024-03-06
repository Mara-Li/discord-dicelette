/**
 * TODO:
 * - Register USER
 * - Parse dice ie:
 * 	Transform this: /r <characters> <statistique> [<bonus/malus> <comments>]
 * 	Into: /r <defaultDice><usagestats><comparesign><valuecompare> []
 * 		ie: /r 1d20+statistiqueValue<=X []
 * 		or: /r 1d20<=statistiqueValue []
 */
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, CommandInteraction, CommandInteractionOptionResolver, EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder, TextChannel } from "discord.js";
import fs from "fs";
import removeAccents from "remove-accents";
import dedent from "ts-dedent";

import { Statistique, StatistiqueTemplate } from "../interface";
import { cmdLn } from "../localizations";
import en from "../localizations/locales/en";
import { rollForUser } from "./roll";
import { title,verifyTemplateValue } from "./utils";

type ComparatorSign = ">" | "<" | ">=" | "<=" | "=" | "!=";


export const generateTemplate = {
	data: new SlashCommandBuilder()
		.setName(en.register.generate.name)
		.setNameLocalizations(cmdLn("register.generate.name"))
		.setDescription("Generate a template for the statistique command")
		.addStringOption(option =>
			option
				.setName(en.register.generate.options.stats.name)
				.setNameLocalizations(cmdLn("register.generate.options.stats.name"))
				.setDescription(en.register.generate.options.stats.description)
				.setDescriptionLocalizations(cmdLn("register.generate.options.stats.description"))
				.setRequired(true)
		)

		.addStringOption(option =>
			option
				.setName(en.register.generate.options.dice.name)
				.setDescription(en.register.generate.options.dice.description)
				.setDescriptionLocalizations(cmdLn("register.generate.options.dice.description"))
				.setNameLocalizations(cmdLn("register.generate.options.dice.name"))
				.setRequired(true)
		)
		.addStringOption(option =>
			option
				.setName("comparator")
				.setDescription("The comparator sign between the statistique or a number")
				.addChoices({
					"name" : "Greater",
					"value" : ">",
				}, {
					"name" : "Greater or equal",
					"value" : ">=",
				}, {
					"name" : "Less",
					"value" : "<",
				}, {
					"name" : "Less or equal",
					"value" : "<=",
				}, {
					"name" : "Equal",
					"value" : "=",
				}, {
					"name" : "Different",
					"value" : "!=",
				})
				.setRequired(true)		
		)
		.addNumberOption(option =>
			option
				.setName("value")
				.setDescription("The value to compare with the result. Let empty to compare with the statistique value.")
				.setRequired(false)
		)
		.addNumberOption(option =>
			option
				.setName("total")
				.setDescription("The total statistique point - optional")
				.setRequired(false)
		)
		.addBooleanOption(option =>
			option
				.setName("character")
				.setDescription("If the user must set a name for them character")
				.setRequired(false)
		)
		.addNumberOption(option =>
			option
				.setName("critical_success")
				.setDescription("if you use critical success (natural dice)")
				.setRequired(false)
		)
		.addNumberOption(option =>
			option
				.setName("critical_fail")
				.setDescription("if you use critical fail (natural dice)")
				.setRequired(false)
		)
		.addStringOption(option =>
			option
				.setName("formula")
				.setDescription("The formula to edit the value. Use $ to symbolise statistique (ie: +$, -$")
				.setRequired(false)		
		),
	async execute(interaction: CommandInteraction): Promise<void> {
		if (!interaction.guild) return;
		const options = interaction.options as CommandInteractionOptionResolver;
		const name = options.getString("name");
		if (!name) return;
		const statistiqueName = name.split(/[, ]+/);
		const statServer: Statistique = {};
		for (const stat of statistiqueName ) {
			statServer[removeAccents(stat)] = {
				max: 0,
				min: 0,
				combinaison: "Can be anything if you don't want to set a proper value. Will be automatically skipped when you register an user. Use statistique name in lowercase and without accent to create the formula"
			};
		}
		const statistiqueTemplate: StatistiqueTemplate = {
			charName: options.getBoolean("character") || false,
			statistiques: statServer,
			diceType: options.getString("dice") || "1d20",
			comparator: {
				sign: options.getString("comparator") as ComparatorSign || ">",
				value: options.getNumber("value") || undefined,
				formula: options.getString("formula") || "",
				criticalFailure: options.getNumber("critical_fail") || 1,
				criticalSuccess: options.getNumber("critical_success") || 20
			},
			total: options.getNumber("total") || 0,
		};
		const help = dedent(`
			- Dice type must be a valid dice (will be tested when template is send)
			- Value must be a number and can be optional : remove it if you don't want to set it
			- Total is optional and can be set to 0 to disable it. It allows to check the total statistiques point for an user.
			- Formula allow to edit the value when combined to the dice. Use $ to symbolise the statistique. For example: \`+$\`, \`-$\`, \`($-10)/2\`...
			- A statistique can be a combinaison of multiple other statistique, like \`(strength + agility)/2\`. If the value \`combinaison\` is set, min-max will be disabled automatically, and you can't register it either : the value will be automatically calculated. More over, this statistique won't count in the total of points you allow. 
		
		Note that, everything can be edited later as you want, this is just a template to help you to create your statistiques.	
		`);
		await interaction.reply({ content: help, files: [{ attachment: Buffer.from(JSON.stringify(statistiqueTemplate, null, 2), "utf-8"), name: "template.json" }]});
	}
};

export const registerTemplate = {
	data: new SlashCommandBuilder()
		.setName("register")
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
		.setDescription("Register a template for the statistique command")
		.addChannelOption(option =>
			option
				.setName("channel")
				.setDescription("The channel to register the template")
				.setRequired(true)
				.addChannelTypes(ChannelType.GuildText)
		)
		.addAttachmentOption(option =>
			option
				.setName("template")
				.setDescription("The template to register")
				.setRequired(true)
		),
	async execute(interaction: CommandInteraction): Promise<void> {
		if (!interaction.guild) return;
		const options = interaction.options as CommandInteractionOptionResolver;
		const template = options.getAttachment("template");
		if (!template) return;
		try {
			//fetch the template
			const res = await fetch(template.url).then(res => res.json());
			const templateData = verifyTemplateValue(res);
			const guildData = interaction.guild.id;
			const channel = options.getChannel("channel");
			if (!channel || !(channel instanceof TextChannel)) return;
			//send template as JSON in the channel, send as file
			//add register button
			const button = new ButtonBuilder()
				.setCustomId("register")
				.setLabel("Register")
				.setStyle(ButtonStyle.Primary);
			const components = new ActionRowBuilder<ButtonBuilder>().addComponents(button);	
			const embedTemplate = new EmbedBuilder()
				.setTitle("Template")
				.setDescription("Click on the button to register an user")
				.setThumbnail("https://github.com/Lisandra-dev/discord-dicelette-plus/blob/main/assets/template.png?raw=true")
				.setColor("Random");
			if (Object.keys(templateData.statistiques).length === 0) {
				interaction.reply({ content: "No statistique found", ephemeral: true });
				return;
			}
			if (Object.keys(templateData.statistiques).length >= 20) {
				interaction.reply({ content: "You can't have more than 20 statistical value", ephemeral: true });
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
				if (msg.length === 0) msg = "No value set";
				embedTemplate.addFields({
					name:title(stat),
					value: msg,
					inline: true,
				});
			}
			//add the last embed
			embedTemplate.addFields({
				name: "Dice",
				value: templateData.diceType,
			});
			let msgComparator = "";
			if (templateData.comparator.value) msgComparator += `- Value: \`${templateData.comparator.value}\`\n`;
			if (templateData.comparator.formula) msgComparator += `- Formula: \`${templateData.comparator.formula}\`\n`;
			if (templateData.comparator.sign) msgComparator += `- Comparator: \`${templateData.comparator.sign}\`\n`;
			embedTemplate.addFields({
				name: "Comparator",
				value: msgComparator,
			});
			if (templateData.total) embedTemplate.addFields({
				name: "Total",
				value: `Total: ${templateData.total}`,
			});
			const msg = await channel.send({ content: "", embeds: [embedTemplate], files: [{ attachment: Buffer.from(JSON.stringify(templateData, null, 2), "utf-8"), name: "template.json" }], components: [components]});
			msg.pin();
			await interaction.reply({ content: "Template registered", ephemeral: true });
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
			await interaction.reply({ content: `Invalid template: \`\`\`\n${e}\`\`\``, ephemeral: true });
		}
	}	
};


export const commands = [generateTemplate, registerTemplate, rollForUser];