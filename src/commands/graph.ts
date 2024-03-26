import {ChartJSNodeCanvas} from "chartjs-node-canvas";
import { AttachmentBuilder, AutocompleteInteraction, CommandInteraction, CommandInteractionOptionResolver, Locale, SlashCommandBuilder } from "discord.js";
import i18next from "i18next";
import parse from "parse-color";
import path from "path";

import { UserData } from "../interface";
import { cmdLn, ln } from "../localizations";
import { filterChoices, title } from "../utils";
import { getGuildData, getUserData, getUserFromMessage } from "../utils/db";

function chart(userData : UserData, lineColor?: string, fillColor?: string) {
	if (!lineColor) lineColor = "#FF0000";
	if (!fillColor) fillColor = "#FF0000";
	if (!userData.stats) return;
	const data = {
		labels: Object.keys(userData.stats).map(key => title(key)),
		datasets: [{
			data: Object.values(userData.stats),
			fill: true,
			backgroundColor: fillColor,
			borderColor: lineColor,
			pointStyle: "cross",
		}]
	};
	const steps = 4;
	const options = {
		elements: {
			line: {
				borderWidth: 1,
			},
		},
		scales: {
			r: {
				angleLines: {
					color: "darkgrey",
					display: true,
					lineWidth: 2,
				},
				grid: {
					color: "darkgrey",
					circular: true,
					lineWidth: 1,
					borderDash: [10, 10],
				},
				ticks: {
					stepSize: steps,
					display: true,
					//eslint-disable-next-line @typescript-eslint/no-explicit-any
					callback: (value: any) => {
						return `• ${value}`;
					},
					color: "darkgrey",
					showLabelBackdrop: false,
					font: {
						family: "Ubuntu",
						size: 30,
					},
					z: 100,
				},
				pointLabels: {
					color: "darkgrey",
					font: {
						size: 30,
						family: "'Jost'",
						weight: "700",
					},
					display: true,
					centerPointLabels: false,
				},
			},
		},
		plugins: {
			legend: {
				display: false,
			},
		},
		aspectRatio: 1,
	};
	const renderer = new ChartJSNodeCanvas({ width: 800, height: 800});
	renderer.registerFont(fontPath("Jost"), { family: "Jost", weight: "700" });
	renderer.registerFont(fontPath("Ubuntu"), { family: "Ubuntu" });
	return renderer.renderToBuffer({
		type: "radar",
		data,
		options
	});

}

function fontPath(fontName: string) {
	return path.resolve(__dirname, `../../assets/fonts/${fontName}.ttf`).replace("dist/", "");
}

const t = i18next.getFixedT("en");

export const graph = {
	data: new SlashCommandBuilder()
		.setName("graph")
		.setDescription("Generate a graph of the user's stats")
		.addUserOption(option =>
			option
				.setName(t("display.userLowercase"))
				.setNameLocalizations(cmdLn("display.userLowercase"))
				.setDescription(t("display.user"))
				.setDescriptionLocalizations(cmdLn("display.user"))
				.setRequired(false)
		)
		.addStringOption(option =>
			option
				.setName(t("common.character"))
				.setNameLocalizations(cmdLn("common.character"))
				.setDescription(t("display.character"))
				.setDescriptionLocalizations(cmdLn("display.character"))
				.setRequired(false)
				.setAutocomplete(true)
		)
		.addStringOption((option) => option
			.setName("line")
			.setDescription("Couleur des lignes. Par défaut: #0e47b2")
			.setRequired(false)
		)
		.addStringOption((option) => option
			.setName("background")
			.setDescription("Couleur du fond du graphique. Par défaut: #0e47b2")
			.setRequired(false)
		),	
	async autocomplete(interaction: AutocompleteInteraction): Promise<void> {
		const options = interaction.options as CommandInteractionOptionResolver;
		const fixed = options.getFocused(true);
		const guildData = getGuildData(interaction);
		if (!guildData) return;
		let choices: string[] = [];
		if (fixed.name === t("common.character")) {
			//get ALL characters from the guild
			const allCharactersFromGuild = Object.values(guildData.user)
				.map((data) => data.map((char) => char.charName ?? ""))
				.flat()
				.filter((data) => data.length > 0);
			choices = allCharactersFromGuild;
		}
		if (choices.length === 0) return;
		const filter = filterChoices(choices, interaction.options.getFocused());
		await interaction.respond(
			filter.map(result => ({ name: title(result) ?? result, value: result}))
		);
	},
	async execute(interaction: CommandInteraction) {
		const options = interaction.options as CommandInteractionOptionResolver;
		const guildData = getGuildData(interaction);
		const ul = ln(interaction.locale as Locale);
		if (!guildData) {
			await interaction.reply(ul("error.noTemplate"));
			return;
		}
		const user = options.getUser(t("display.userLowercase"));
		const charName = options.getString(t("common.character"))?.toLowerCase();
		let charData: { [key: string]: {
			charName?: string;
			messageId: string;
			damageName?: string[];
		} } = {};
		if (!user && charName) {
			//get the character data in the database 
			const allUsersData = guildData.user;
			const allUsers = Object.entries(allUsersData);
			for (const [user, data] of allUsers) {
				const userChar = data.find((char) => char.charName === charName);
				if (userChar) {
					charData = {
						[user as string]: userChar
					};
					break;
				}
			}
		} else {
			const userData = getUserData(guildData, user?.id ?? interaction.user.id);
			const findChara = userData?.find((char) => char.charName === charName);
			if (!findChara) {
				const userName = user?.username ?? interaction.user.username;
				if (charName) userName.concat(` (${charName})`);
				await interaction.reply(ul("error.userNotRegistered", {user: userName}));
				return;
			}
			charData = {
				[(user?.id ?? interaction.user.id)]: findChara
			};
		}
		try {
			if (!interaction.guild || !interaction.channel) return;
			const userId =  user?.id ?? interaction.user.id;
			const charName = charData[userId].charName;
			const userStatistique = await getUserFromMessage(guildData, userId, interaction.guild, interaction, charName);
			if (!userStatistique) {
				await interaction.reply(ul("error.notRegistered"));
				return;
			}
			const lineColor = options.getString("line");
			const fillColor = options.getString("background");
			const color = generateColor(lineColor, fillColor);
			const image = await imagePersonalized(userStatistique, color.line, color.background);
			if (!image) {
				await interaction.reply(ul("error.noMessage"));
				return;
			}
			await interaction.reply({ files: [image] });
		} catch (error) {
			await interaction.reply(ul("error.noMessage"));
		}
	}
		
};

function generateColor(line: string | null, background: string | null) {
	if (line && !background) {
		background = convertHexToRGBA(line, 0.5);
	} else if (!line && background) {
		line = convertHexToRGBA(background, 1);
	} else if (!line && !background) {
		line = "#0e47b2";
		background = "#0e47b2";
	}
	line = convertHexToRGBA(line as string, 1);
	background = convertHexToRGBA(background as string, 0.5);
	return {line, background};
}

function convertHexToRGBA(color: string, alpha?: number) {
	const parsedColor = parse(color);
	if (alpha) {
		parsedColor.rgba[parsedColor.rgba.length - 1] = alpha;
	}
	return `rgba(${parsedColor.rgba.join(", ")})`;
}

export async function imagePersonalized(stat: UserData, lineColor?: string, fillColor?: string) {
	const charGraph = await chart(stat, lineColor, fillColor);
	if (!charGraph) return;
	return new AttachmentBuilder(charGraph);
}

