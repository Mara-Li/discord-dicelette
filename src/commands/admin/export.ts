/**
 * Allow to export all characters from the database to a CSV file
*/

import { cmdLn } from "@localization";
import { EClient } from "@main";
import { removeEmojiAccents } from "@utils";
import { getUserFromMessage } from "@utils/db";
import { CommandInteraction, CommandInteractionOptionResolver, SlashCommandBuilder } from "discord.js";
import i18next from "i18next";
import Papa from "papaparse";

import { CSVRow } from "./import";

const t = i18next.getFixedT("en");
export const exportData = {
	data: new SlashCommandBuilder()
		.setName(t("export.name"))
		.setNameLocalizations(cmdLn("export.name"))
		.setDescription(t("export.description"))
		.setDescriptionLocalizations(cmdLn("export.description"))
		.addBooleanOption(option =>
			option
				.setName(t("export.options.name"))
				.setNameLocalizations(cmdLn("export.options.name"))
				.setDescription(t("export.options.desc"))
				.setDescriptionLocalizations(cmdLn("export.options.desc"))
				.setRequired(false)),
	async execute(interaction: CommandInteraction, client: EClient) {
		if (!interaction.guild) return;
		const options = interaction.options as CommandInteractionOptionResolver;
		const isPrivate = options.getBoolean(t("export.options.name")) ?? undefined;
		const allUser = client.settings.get(interaction.guild!.id, "user");
		await interaction.deferReply();
		if (!allUser) {
			await interaction.reply(t("export.error.noData"));
			return;
		}
		const csv: CSVRow[] = [];
		const statsName = client.settings.get(interaction.guild.id, "templateID.statsName");
		const isPrivateAllowed = client.settings.get(interaction.guild.id, "privateChannel");
		//filter the allUser to get only the private characters
		for (const [user, data] of Object.entries(allUser)) {
			const chara = isPrivate ? data.filter((char) => char.isPrivate) : isPrivate === false ? data.filter((char) => !char.isPrivate) : data;
			for (const char of chara) {
				const stats = await getUserFromMessage(client.settings, user, interaction, char.charName, {skipNotFound: true});
				if (!stats) continue;
				//reparse the statsName to get the name with accented characters
				const dice: undefined | string = stats.damage ? Object.keys(stats.damage).map((key) => `- ${key}: ${stats.damage?.[key]}`).join("\n") : undefined;
				let newStats: { [key: string]: number | undefined} = {};
				if (statsName && stats.stats) {
					for (const name of statsName) {
						newStats[name] = stats.stats?.[removeEmojiAccents(name)];
					}
				} else if (stats.stats) newStats = stats.stats;
				csv.push({
					user,
					charName: char.charName,
					isPrivate: char.isPrivate !== undefined ? char.isPrivate : isPrivateAllowed ? false : undefined,
					dice,
					...newStats,
				});
			}
		}
		
		const columns = ["user", "charName"];
		if (client.settings.get(interaction.guild.id, "privateChannel")) columns.push("isPrivate");
		if (statsName) columns.push(...statsName);
		columns.push("dice");
		const csvText = Papa.unparse(csv, {
			delimiter: ";",
			skipEmptyLines: true,
			columns,
			quotes: [true],
			header: true,
		});
		const buffer = Buffer.from(`\ufeff${csvText}`, "utf-8");
		await interaction.editReply({
			files: [{
				attachment: buffer,
				name: "export.csv",
			}],
		});
	},
};