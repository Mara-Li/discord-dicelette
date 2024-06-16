import { log } from "@console";
import type { UserData } from "@interface";
import { cmdLn, ln } from "@localization";
import type { EClient } from "@main";
import {
	filterChoices,
	haveAccess,
	removeEmojiAccents,
	reply,
	sendLogs,
	title,
} from "@utils";
import { getDatabaseChar, getTemplateWithDB, getUserFromMessage } from "@utils/db";
import { ChartJSNodeCanvas } from "chartjs-node-canvas";
import {
	AttachmentBuilder,
	type AutocompleteInteraction,
	type CommandInteraction,
	type CommandInteractionOptionResolver,
	type Locale,
	SlashCommandBuilder,
	userMention,
} from "discord.js";
import i18next from "i18next";
import parse from "parse-color";
import path from "node:path";

async function chart(
	userData: UserData,
	labels: string[],
	lineColor = "#FF0000",
	fillColor = "#FF0000",
	min?: number,
	max?: number
) {
	if (!userData.stats) return;
	const data = {
		labels: labels.map((key) => title(key)),
		datasets: [
			{
				data: Object.values(userData.stats),
				fill: true,
				backgroundColor: fillColor,
				borderColor: lineColor,
				pointStyle: "cross",
			},
		],
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
					display: false,
					color: "darkgrey",
					showLabelBackdrop: false,
					centerPointLabels: true,
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
						family: "Jost",
						weight: "700",
					},
					display: true,
					centerPointLabels: false,
				},
				suggestedMin: min,
				suggestedMax: max,
			},
		},
		plugins: {
			legend: {
				display: false,
			},
		},
		aspectRatio: 1,
	};
	const renderer = new ChartJSNodeCanvas({ width: 800, height: 800 });
	renderer.registerFont(fontPath("Jost-Regular"), { family: "Jost", weight: "700" });
	renderer.registerFont(fontPath("Ubuntu-Regular"), { family: "Ubuntu" });
	return await renderer.renderToBuffer({
		type: "radar",
		data,
		options,
	});
}

function fontPath(fontName: string) {
	return path.resolve(`assets/fonts/${fontName}.ttf`).replace("dist/", "");
}

const t = i18next.getFixedT("en");

export const graph = {
	data: new SlashCommandBuilder()
		.setName(t("graph.name"))
		.setDefaultMemberPermissions(0)
		.setNameLocalizations(cmdLn("graph.name"))
		.setDescription(t("graph.description"))
		.setDescriptionLocalizations(cmdLn("graph.description"))
		.addUserOption((option) =>
			option
				.setName(t("display.userLowercase"))
				.setNameLocalizations(cmdLn("display.userLowercase"))
				.setDescription(t("display.user"))
				.setDescriptionLocalizations(cmdLn("display.user"))
				.setRequired(false)
		)
		.addStringOption((option) =>
			option
				.setName(t("common.character"))
				.setNameLocalizations(cmdLn("common.character"))
				.setDescription(t("display.character"))
				.setDescriptionLocalizations(cmdLn("display.character"))
				.setRequired(false)
				.setAutocomplete(true)
		)
		.addStringOption((option) =>
			option
				.setName(t("graph.line.name"))
				.setDescription(t("graph.line.description"))
				.setDescriptionLocalizations(cmdLn("graph.line.description"))
				.setNameLocalizations(cmdLn("graph.line.name"))
				.setRequired(false)
		)
		.addNumberOption((option) =>
			option
				.setName(t("graph.min.name"))
				.setDescription(t("graph.min.description"))
				.setDescriptionLocalizations(cmdLn("graph.min.description"))
				.setNameLocalizations(cmdLn("graph.min.name"))
				.setRequired(false)
		)
		.addNumberOption((option) =>
			option
				.setName(t("graph.max.name"))
				.setDescription(t("graph.max.description"))
				.setRequired(false)
				.setDescriptionLocalizations(cmdLn("graph.max.description"))
				.setNameLocalizations(cmdLn("graph.max.name"))
		)
		.addStringOption((option) =>
			option
				.setName(t("graph.bg.name"))
				.setDescription(t("graph.bg.description"))
				.setNameLocalizations(cmdLn("graph.bg.name"))
				.setDescriptionLocalizations(cmdLn("graph.bg.description"))
				.setRequired(false)
		),
	async autocomplete(
		interaction: AutocompleteInteraction,
		client: EClient
	): Promise<void> {
		const options = interaction.options as CommandInteractionOptionResolver;
		const fixed = options.getFocused(true);
		const guildData = client.settings.get(interaction.guild!.id);

		if (!guildData) return;
		const choices: string[] = [];
		let user = options.get(t("display.userLowercase"))?.value ?? interaction.user.id;
		if (typeof user !== "string") {
			user = interaction.user.id;
		}
		if (fixed.name === t("common.character")) {
			const guildChars = guildData.user[user as string];
			if (!guildChars) return;
			for (const data of guildChars) {
				const allowed = haveAccess(interaction, data.messageId[1], user as string);
				if (data.charName)
					if (!data.isPrivate) choices.push(data.charName);
					else if (allowed) choices.push(data.charName);
			}
		}
		if (choices.length === 0) return;
		const filter = filterChoices(choices, interaction.options.getFocused());
		await interaction.respond(
			filter.map((result) => ({ name: title(result) ?? result, value: result }))
		);
	},
	async execute(interaction: CommandInteraction, client: EClient) {
		const options = interaction.options as CommandInteractionOptionResolver;
		if (!interaction.guild) return;
		const guildData = client.settings.get(interaction.guild!.id);
		let min = options.getNumber(t("graph.min.name")) ?? undefined;
		let max = options.getNumber(t("graph.max.name")) ?? undefined;
		const ul = ln(interaction.locale as Locale);
		if (!guildData) {
			await reply(interaction, ul("error.noTemplate"));
			return;
		}
		const serverTemplate = await getTemplateWithDB(interaction, client.settings);
		if (!guildData.templateID.statsName || !serverTemplate?.statistics) {
			await reply(interaction, ul("error.noStats"));
			return;
		}
		const user = options.getUser(t("display.userLowercase"));
		const charData = await getDatabaseChar(interaction, client, t);
		const charName = options.getString(t("common.character"))?.toLowerCase();
		let userName = `<@${user?.id ?? interaction.user.id}>`;
		if (charName) userName += ` (${charName})`;
		if (!charData) {
			await reply(interaction, ul("error.userNotRegistered", { user: userName }));
			return;
		}
		try {
			if (!interaction.guild || !interaction.channel) return;
			const userId = user?.id ?? interaction.user.id;
			const charName = charData[userId].charName;
			const userStatistique = await getUserFromMessage(
				client.settings,
				userId,
				interaction,
				charName,
				{ integrateCombinaison: false, allowAccess: false }
			);
			if (!userStatistique || !userStatistique.stats) {
				await reply(interaction, ul("error.notRegistered"));
				return;
			}
			const titleUser = () => {
				let msg = "# ";
				if (charName) msg += `${title(charName)} `;
				msg += `⌈${userMention(userId)}⌋ `;
				return msg;
			};
			const labels = guildData.templateID.statsName;
			//only keep labels that exists in the user stats
			const userStatKeys = Object.keys(userStatistique.stats).map((key) =>
				removeEmojiAccents(key)
			);
			const filteredLabels = labels.filter((label) =>
				userStatKeys.includes(removeEmojiAccents(label))
			);
			const lineColor = options.getString(t("graph.line.name"));
			const fillColor = options.getString(t("graph.bg.name"));
			const color = generateColor(lineColor, fillColor);

			if (serverTemplate?.statistics && (!min || !max)) {
				if (!min) {
					const allMin = Object.values(serverTemplate.statistics)
						.map((stat) => {
							if (stat.min == null) return 0;
							return stat.min;
						})
						.filter((min) => min > 0);
					if (allMin.length > 0) min = Math.min(...allMin);
				}
				if (!max) {
					const allMax = Object.values(serverTemplate.statistics).map((stat) => {
						if (stat.max == null) return 0;
						return stat.max;
					});
					max = Math.max(...allMax);
				}

				if (min === 0) min = undefined;
				if (max === 0) {
					if (serverTemplate.critical?.success) {
						max = serverTemplate.critical.success;
					} else if (serverTemplate.diceType) {
						const comparatorRegex = /(?<sign>[><=!]+)(?<comparator>(\d+))/.exec(
							serverTemplate.diceType
						);
						if (comparatorRegex?.groups?.comparator) {
							max = Number.parseInt(comparatorRegex.groups.comparator, 10);
						} else {
							const diceMatch = /d(?<face>\d+)/.exec(serverTemplate.diceType);
							max = diceMatch?.groups?.face
								? Number.parseInt(diceMatch.groups.face, 10)
								: undefined;
						}
					}
				} else max = undefined;
			}
			const image = await imagePersonalized(
				userStatistique,
				filteredLabels,
				color.line,
				color.background,
				min,
				max
			);
			if (!image) {
				await reply(interaction, ul("error.noMessage"));
				return;
			}
			await reply(interaction, { content: titleUser(), files: [image] });
		} catch (error) {
			await reply(interaction, ul("error.generic", { e: error as Error }));
			sendLogs(
				ul("error.generic", { e: error as Error }),
				interaction.guild,
				client.settings
			);
			log(error);
		}
	},
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
	return { line, background };
}

function convertHexToRGBA(color: string, alpha?: number) {
	const parsedColor = parse(color);
	if (alpha) {
		parsedColor.rgba[parsedColor.rgba.length - 1] = alpha;
	}
	return `rgba(${parsedColor.rgba.join(", ")})`;
}

async function imagePersonalized(
	stat: UserData,
	labels: string[],
	lineColor?: string,
	fillColor?: string,
	min?: number,
	max?: number
) {
	const charGraph = await chart(stat, labels, lineColor, fillColor, min, max);
	if (!charGraph) return;
	return new AttachmentBuilder(charGraph);
}
