/**
 * TODO:
 * - Register USER
 * - Parse dice ie:
 * 	Transform this: /r <characters> <statistique> [<bonus/malus> <comments>]
 * 	Into: /r <defaultDice><usagestats><comparesign><valuecompare> []
 * 		ie: /r 1d20+statistiqueValue<=X []
 * 		or: /r 1d20<=statistiqueValue []
 */
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, CommandInteraction, CommandInteractionOptionResolver, SlashCommandBuilder, TextChannel } from "discord.js";
import fs from "fs";
import removeAccents from "remove-accents";
import { Statistique, StatistiqueTemplate } from "src/interface";
import dedent from "ts-dedent";

import { verifyTemplateValue } from "./utils";

type ComparatorSign = ">" | "<" | ">=" | "<=" | "=" | "!=";
type UsageSign = "+" | "-";

export const generateTemplate = {
	data: new SlashCommandBuilder()
		.setName("generate")
		.setDescription("Generate a template for the statistique command")
		.addStringOption(option =>
			option
				.setName("name")
				.setDescription("The name of the statistique, separate them by a space or a coma")
				.setRequired(true)
		)

		.addStringOption(option =>
			option
				.setName("dice")
				.setDescription("The dice type")
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
		const statServer: Statistique[] = [];
		for (const stat of statistiqueName ) {
			statServer.push({ [removeAccents(stat)]: {
				max: 0,
				min: 0,
				combinaison: "Can be anything if you don't want to set a proper value. Will be automatically skipped when you register an user. Use statistique name in lowercase and without accent to create the formula"
			} });
		}
		const statistiqueTemplate: StatistiqueTemplate = {
			charName: options.getBoolean("character") || false,
			statistiques: statServer,
			diceType: options.getString("dice") || "1d20",
			comparator: {
				sign: options.getString("comparator") as ComparatorSign || ">",
				value: options.getNumber("value") || undefined,
				formula: options.getString("formula") || "",
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
		.setDescription("Register a template for the statistique command")
		.addChannelOption(option =>
			option
				.setName("channel")
				.setDescription("The channel to register the template")
				.setRequired(true)
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
			const registerButton = new ButtonBuilder()
			.setCustomId("register")
			.setLabel("Register a new user")
			.setStyle(ButtonStyle.Primary)
			const row = new ActionRowBuilder<ButtonBuilder>().addComponents(registerButton)
			const msg = await channel.send({ content: "# __TEMPLATE__", files: [{ attachment: Buffer.from(JSON.stringify(templateData, null, 2), "utf-8"), name: "template.json" }], components: [row] });
			msg.pin();
			await interaction.reply({ content: "Template registered", ephemeral: true });
			//save in database file
			const data = fs.readFileSync("database.json", "utf-8");
			const json = JSON.parse(data);
			if (json[guildData]) {
				json[guildData].templateID = {
					channel: channel.id,
					message: msg.id
				};
			} else {
				json[guildData] = {
					templateID: {
						channel: channel.id,
						message: msg.id
					},
					referenceId: "0"
				};
			}
			fs.writeFileSync("database.json", JSON.stringify(json, null, 2), "utf-8");
		} catch (e) {
			await interaction.reply({ content: `Invalid template: \`\`\`\n${e}\`\`\``, ephemeral: true });
		}
	}	
};

export const commands = [generateTemplate, registerTemplate];