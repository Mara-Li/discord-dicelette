/**
 * TODO:
 * - Register USER
 * - Parse dice ie:
 * 	Transform this: /r <characters> <statistique> [<bonus/malus> <comments>]
 * 	Into: /r <defaultDice><usagestats><comparesign><valuecompare> []
 * 		ie: /r 1d20+statistiqueValue<=X []
 * 		or: /r 1d20<=statistiqueValue []
 */
import { CommandInteraction, CommandInteractionOptionResolver, SlashCommandBuilder, TextChannel } from "discord.js";
import fs from "fs";
import removeAccents from "remove-accents";
import { Statistique, StatistiqueTemplate } from "src/interface";
import dedent from "ts-dedent";

import { verifyTemplateValue } from "./utils";

export const generateTemplate = {
	data: new SlashCommandBuilder()
		.setName("generate")
		.setDescription("Generate a template for the statistique command")
		.addStringOption(option =>
			option
				.setName("name")
				.setDescription("The name of the statistique, separate them by a space or a coma")
				.setRequired(true)
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
			} });
		}
		const statistiqueTemplate: StatistiqueTemplate = {
			statistiques: statServer,
			diceType: "",
			statistiqueUsage: "+",
			comparator: {
				sign: ">",
				value: 0,
			},
			total: 0
		};
		const help = dedent(`
			- Max and min must be number and can be optional : remove them if you don't want to set them
			- Dice type must be a valid dice (will be tested when template is send)
			- Comparator sign must be a valid sign in the list : \`>\`, \`<\`, \`>=\`, \`<=\`, \`=\`, \`!=\`
			- Value must be a number and can be optional : remove it if you don't want to set it
			- statistiqueUsage can be \`+\`, \`-\` or undefined (optional). It allows to add / remove the statistique to the dice result
			- Total is optional and can be set to 0 to disable it. You can also remove it. It allows to check the total statistiques point for an user.

		`);
		await interaction.reply({ content: help + `Here is your template: \n\`\`\`json\n${JSON.stringify(statistiqueTemplate, null, 2)}\n\`\`\`` });
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
			const msg = await channel.send({ files: [{ attachment: Buffer.from(JSON.stringify(templateData, null, 2), "utf-8"), name: "template.json" }] });
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