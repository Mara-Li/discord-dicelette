/**
 * Allow to add multiple people to the user database at once, using a CSV file.
 * The bot will register user as the other commands, with adding them into the user thread using {@link validateUser}
 */


import { createDiceEmbed, createStatsEmbed, createUserEmbed } from "@database";
import { StatisticalTemplate } from "@dicelette/core";
import { UserData } from "@interface";
import { cmdLn, ln } from "@localization";
import { EClient } from "@main";
import { addAutoRole, removeEmojiAccents, reply, repostInThread, title } from "@utils";
import { getTemplateWithDB } from "@utils/db";
import { createEmbedsList } from "@utils/parse";
import {CommandInteraction, CommandInteractionOptionResolver, EmbedBuilder, GuildMember, Locale, PermissionFlagsBits,roleMention,SlashCommandBuilder,  TextChannel,  User,  userMention } from "discord.js";
import i18next from "i18next";
import Papa from "papaparse";

const t = i18next.getFixedT("en");

type CSVRow = {
	user: string;
	charName: string | undefined;
	isPrivate: boolean | undefined;
	[key: string]: string | number | undefined | boolean;
};

/**
 * ! Note: Bulk data doesn't allow to register dice-per-user, as each user can have different dice
 * I don't want to think about a specific way to handle this, so I will just ignore it for now.
 */
export const bulkAdd = {
	data: new SlashCommandBuilder()
		.setName(t("bulk_add.name"))
		.setDMPermission(false)
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
		.setNameLocalizations(cmdLn("bulk_add.name"))
		.setDescription(t("bulk_add.description"))
		.setDescriptionLocalizations(cmdLn("bulk_add.description"))
		.addAttachmentOption((option) => option
			.setName(t("bulk_add.options.name"))
			.setNameLocalizations(cmdLn("bulk_add.options.name"))
			.setDescription(t("bulk_add.options.description"))
			.setDescriptionLocalizations(cmdLn("bulk_add.options.description"))
			.setRequired(true),
		),
	async execute(interaction: CommandInteraction, client: EClient) {
		const options = interaction.options as CommandInteractionOptionResolver;
		const csvFile = options.getAttachment(t("bulk_add.options.name"), true);
		const ul= ln(interaction.locale);
		await interaction.deferReply({ephemeral: true});
		const ext = csvFile.name.split(".").pop()?.toLowerCase() ?? "";
		if (!ext || ext !== "csv") {
			return reply(interaction, {content: ul("bulk_add.errors.invalid_file", { ext })});
		}
		/** download the file using paparse */
		const guildTemplate = await getTemplateWithDB(interaction, client.settings);
		if (!guildTemplate) {
			return reply(interaction, {content: ul("error.noTemplate")});
		}
		const members = await parseCSV(csvFile.url, guildTemplate, interaction, client.settings.has(interaction.guild!.id, "hiderChannel"));
		for (const [user, data] of Object.entries(members)) {
			//we already parsed the user, so the cache should be up to date
			let member : GuildMember | User | undefined = interaction.guild?.members.cache.get(user);
			if (!member || !member.user) {
				continue;
			}
			member = member.user as User;
			for (const char of data) {
				const userDataEmbed = createUserEmbed(ul, member.avatarURL());
				userDataEmbed.addFields({
					name: ul("common.charName"),
					value: char.userName ?? "/",
					inline: true,
				});
				userDataEmbed.addFields({
					name: ul("common.user"),
					value: userMention(member.id),
					inline: true,
				});

				const statsEmbed = char.stats ? createStatsEmbed(ul) : undefined;
				const diceEmbed = guildTemplate.damage ? createDiceEmbed(ul) : undefined;
				//! important: As the bulk add can be for level upped characters, the value is not verified (min/max) & total points
				for (const [name, value] of Object.entries(char.stats ?? {})) {
					const validateValue = guildTemplate.statistics?.[name];
					const fieldValue = validateValue?.combinaison ? `\`${validateValue.combinaison}\` = ${value}` : `\`${value}\``;
					statsEmbed!.addFields({
						name : title(name),
						value: fieldValue,
						inline: true,
					});
				}
				for (const [name, dice] of Object.entries(guildTemplate.damage ?? {})) {
					diceEmbed!.addFields({
						name : title(name),
						value: `\`${dice}\``,
						inline: true,
					});
				}
				let templateEmbed: EmbedBuilder | undefined = undefined;
				if (guildTemplate.diceType || guildTemplate.critical) {
					templateEmbed = new EmbedBuilder()
						.setTitle(ul("embed.template"))
						.setColor("DarkerGrey");
					templateEmbed.addFields({
						name: ul("common.dice"),
						value: `\`${guildTemplate.diceType}\``,
						inline: true,
					});
					if (guildTemplate.critical?.success) {
						templateEmbed.addFields({
							name: ul("roll.critical.success"),
							value: `\`${guildTemplate.critical.success}\``,
							inline: true,
						});
					}
					if (guildTemplate.critical?.failure) {
						templateEmbed.addFields({
							name: ul("roll.critical.failure"),
							value: `\`${guildTemplate.critical.failure}\``,
							inline: true,
						});
					}
				}
				const allEmbeds = createEmbedsList(userDataEmbed, statsEmbed, diceEmbed, templateEmbed);
				await repostInThread(allEmbeds, interaction, char, member.id, ul, {stats: statsEmbed ? true : false, dice: diceEmbed ? true : false, template: templateEmbed ? true : false}, client.settings);
				addAutoRole(interaction, member.id, !!diceEmbed, !!statsEmbed, client.settings);
				
				await reply(interaction, {content: ul("bulk_add.user.success", {user: userMention(member.id)})});
			}
		}
		await reply(interaction, {content: ul("bulk_add.all_success")});
		return;
	}
};

/** Allow to create a CSV file for easy edition
 * Need to be opened by excel or google sheet because CSV is not the best in notepad
 */

export const bulkAddTemplate = {
	data: new SlashCommandBuilder()
		.setName(t("bulk_add_template.name"))
		.setDMPermission(false)
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
		.setNameLocalizations(cmdLn("bulk_add_template.name"))
		.setDescription(t("bulk_add_template.description"))
		.setDescriptionLocalizations(cmdLn("bulk_add_template.description")),
	async execute(interaction: CommandInteraction, client: EClient) {
		if (!interaction.guild) return;
		const ul = ln(interaction.locale);
		const guildTemplate = await getTemplateWithDB(interaction, client.settings);
		if (!guildTemplate) {
			return reply(interaction, {content: ul("error.noTemplate")});
		}
		const header = [
			"user",
			"charName",
		];
		if (guildTemplate.statistics) {
			header.push(...Object.keys(guildTemplate.statistics));
		}
		//create CSV
		const csvText = `\ufeff${header.join(";")}\n`;
		const buffer = Buffer.from(csvText, "utf-8");
		await interaction.reply({content: ul("bulk_add_template.success"),
			files: [{attachment: buffer, name: "template.csv"}]});
	}
};
/**
 * Export a function to parse a CSV file and return the data, using PapaParse
 * @param url {string} The URL of the CSV file, or the content of the file as string
 * @param guildTemplate {StatisticalTemplate} The template of the guild
 * @param interaction {CommandInteraction | undefined} The interaction to reply to, if any (undefined if used in test)
 * @returns {Promise<{[id: string]: UserData[]}>} The data parsed from the CSV file
 */
export async function parseCSV(url: string, guildTemplate: StatisticalTemplate, interaction?: CommandInteraction, allowPrivate?: boolean): Promise<{ [id: string]: UserData[]; }> {	
	let header = [
		"user",
		"charName",
	];
	if (guildTemplate.statistics) {
		header = header.concat(Object.keys(guildTemplate.statistics));
	}
	if (allowPrivate) header.push("isPrivate");
	const ul = ln(interaction?.locale ?? "en" as Locale);
	if (guildTemplate.damage) {
		header = header.concat(Object.keys(guildTemplate.damage));
	}
	header = header.map(key => removeEmojiAccents(key));
	//papaparse can't be used in Node, we need first to create a readable stream

	const csvText = url.startsWith("https://") ? await readCSV(url) : url;
	if (!csvText || csvText.length === 0) {
		throw new Error("Invalid CSV content");
	}
	let error: string | undefined = undefined;
	let csvData: CSVRow[] = [];
	Papa.parse(csvText.replaceAll(/\s+;\s*/gi, ";"), {
		header: true,
		dynamicTyping: true,
		skipEmptyLines: true,
		//in case the file was wrongly parsed, we need to trim the space before and after the key
		
		async complete(results) {
			if (!results.data) {
				console.error("Error while parsing CSV", results.errors);
				error= "Error while parsing CSV";
				return;
			}
			//throw error if missing header (it shouldn't not throw if a header is added)
			const dataHeader = results.meta.fields?.map(key => removeEmojiAccents(key));
			if (!dataHeader) {
				console.error("Error while parsing CSV, missing header");
				if (interaction) await reply(interaction, {content: ul("bulk_add.errors.missing_header")});
				error= "Missing header";
				return;
			}
			//throw error only if missing values for the header
			const missingHeader = header.filter(key => !dataHeader.includes(key));
			if (missingHeader.length > 0) {
				console.error("Error while parsing CSV, missing header values", missingHeader);
				if (interaction) await reply(interaction, {content: ul("bulk_add.errors.headers", {name: missingHeader.join("\n- ")})});
				error = "Missing header values";
				return;
			}
			csvData = results.data as CSVRow[];
		},
		
	});
	if (error) {
		throw new Error(error);
	}
	if (csvData.length === 0) {
		throw new Error("Invalid CSV content");
	}
	return await step(csvData, guildTemplate, interaction, allowPrivate);
}

/**
 * Read the distant CSV file
 * @param url {string} The URL of the CSV file
 * @returns {Promise<string>}
 */
async function readCSV(url: string): Promise<string> {
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error("Invalid URL");
	}
	return response.text();

}

/**
 * Parse the csv file and return the data in the correct format
 * @param csv {CSVRow[]} The data parsed from the CSV file
 * @param guildTemplate {StatisticalTemplate} The template of the guild
 * @param interaction {CommandInteraction | undefined} The interaction to reply to, if any (undefined if used in test)
 * @returns {Promise<{[id: string]: UserData[]}>} The data parsed from the CSV file
 */
async function step(csv: CSVRow[], guildTemplate: StatisticalTemplate, interaction?: CommandInteraction, allowPrivate?: boolean): Promise<{ [id: string]: UserData[]; }> {
	const members: {
		[id: string]: UserData[];
	} = {};
	const ul = ln(interaction?.locale ?? "en" as Locale);
	//get the user id from the guild
	for (const data of csv) {
		const user = data.user;
		const charName = data.charName;
		
		//get user from the guild
		let guildMember: undefined | GuildMember;
		let userID: string | undefined = user;
		if (interaction) {
			guildMember = (await interaction.guild!.members.fetch({query: user})).first();
			if (!guildMember || !guildMember.user) {
				console.warn("Invalid user");
				continue;
			}
			userID = guildMember.id;
		} 
		const isPrivate = data.isPrivate;
		if (!members[userID]) members[userID] = [];
		if (guildTemplate.charName && !charName) {
			if (interaction) await reply(interaction, {content: ul("bulk_add.errors.missing_charName", {user: userMention(userID)})});
			console.warn(`Missing character name for ${user}`);
			continue;
		}
		//prevent duplicate with verify the charName
		if (members[userID].find(char => {
			if (char.userName && charName) return removeEmojiAccents(char.userName) === removeEmojiAccents(charName);
			else if (!char.userName && !charName) return true;
			else return false;
		})) {
			console.warn("Duplicate character");
			continue;
		}
		const stats: {[name: string]: number} = {};
		//get the stats
		if (guildTemplate.statistics) {
			const emptyStats = Object.keys(guildTemplate.statistics).filter(key => !data[key]);
			if (emptyStats.length > 0) {
				if (interaction) await reply(interaction, {content: ul("bulk_add.errors.missing_stats", {
					user: userMention(userID), 
					stats: emptyStats.join("\n- ")})
				});
				console.warn(`Missing stats for ${user}. Missing: ${emptyStats.join("\n- ")}`);
				continue;
			}
			Object.keys(guildTemplate.statistics).forEach(key => {
				stats[key] = data[key] as number;
			});
		}
		const newChar = {
			userName: charName,
			stats,
			template: {
				diceType: guildTemplate.diceType,
				critical: guildTemplate.critical,
			},
			private: allowPrivate ? isPrivate : undefined,
		};
		if (!newChar.private) delete newChar.private;
		members[userID].push(newChar);
	}
	return members;
}

