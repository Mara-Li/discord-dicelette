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
			option.setName("private")
				.setDescription(t("export.options.private"))
				.setDescriptionLocalizations(cmdLn("export.options.private"))
				.setRequired(false)),
	async execute(interaction: CommandInteraction, client: EClient) {
		if (!interaction.guild) return;
		const options = interaction.options as CommandInteractionOptionResolver;
		const isPrivate = options.getBoolean("private") ?? undefined;
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
					...newStats,
				});
			}
		}
		
		const columns = ["user", "charName"];
		if (client.settings.get(interaction.guild.id, "privateChannel")) columns.push("isPrivate");
		if (statsName) columns.push(...statsName);
		const csvText = Papa.unparse(csv, {
			delimiter: ";",
			skipEmptyLines: true,
			columns,
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