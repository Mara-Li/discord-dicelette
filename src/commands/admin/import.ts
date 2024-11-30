/**
 * Allow to add multiple people to the user database at once, using a CSV file.
 * The bot will register user as the other commands, with adding them into the user thread using {@link validateUser}
 */

import type { StatisticalTemplate } from "@dicelette/core";
import { createDiceEmbed, createStatsEmbed, createUserEmbed } from "@interactions";
import type { UserData } from "@interfaces/database";
import { cmdLn, ln } from "@localization";
import { type EClient, logger } from "@main";
import {
	InvalidCsvContent,
	InvalidURL,
	addAutoRole,
	reply,
	repostInThread,
} from "@utils";
import { getTemplateWithDB } from "@utils/db";
import { createEmbedsList } from "@utils/parse";
import * as Djs from "discord.js";
import i18next from "i18next";
import Papa from "papaparse";

const t = i18next.getFixedT("en");

export type CSVRow = {
	user: string;
	charName: string | undefined | null;
	avatar: string | undefined | null;
	isPrivate: boolean | undefined;
	channel: string | undefined;
	dice: string | undefined;
	[key: string]: string | number | undefined | boolean | null;
};

/**
 * ! Note: Bulk data doesn't allow to register dice-per-user, as each user can have different dice
 * I don't want to think about a specific way to handle this, so I will just ignore it for now.
 */
export const bulkAdd = {
	data: new Djs.SlashCommandBuilder()
		.setName(t("import.name"))
		.setDMPermission(false)
		.setDefaultMemberPermissions(Djs.PermissionFlagsBits.ManageRoles)
		.setNameLocalizations(cmdLn("import.name"))
		.setDescription(t("import.description"))
		.setDescriptionLocalizations(cmdLn("import.description"))
		.addAttachmentOption((option) =>
			option
				.setName(t("import.options.name"))
				.setNameLocalizations(cmdLn("import.options.name"))
				.setDescription(t("import.options.description"))
				.setDescriptionLocalizations(cmdLn("import.options.description"))
				.setRequired(true)
		),
	async execute(interaction: Djs.CommandInteraction, client: EClient) {
		const options = interaction.options as Djs.CommandInteractionOptionResolver;
		const csvFile = options.getAttachment(t("import.options.name"), true);
		const langToUse =
			client.settings.get(interaction.guild!.id, "lang") ??
			interaction.guild?.preferredLocale ??
			interaction.locale;
		const ul = ln(langToUse);
		await interaction.deferReply({ ephemeral: true });
		const ext = csvFile.name.split(".").pop()?.toLowerCase() ?? "";
		if (!ext || ext !== "csv") {
			return reply(interaction, { content: ul("import.errors.invalid_file", { ext }) });
		}
		/** download the file using paparse */
		const guildTemplate = await getTemplateWithDB(interaction, client.settings);
		if (!guildTemplate) {
			return reply(interaction, { content: ul("error.noTemplate") });
		}
		const { members, errors } = await parseCSV(
			csvFile.url,
			guildTemplate,
			interaction,
			client.settings.has(interaction.guild!.id, "privateChannel"),
			langToUse
		);
		const defaultChannel = client.settings.get(interaction.guild!.id, "managerId");
		const privateChannel = client.settings.get(interaction.guild!.id, "privateChannel");
		if (!defaultChannel) {
			return reply(interaction, { content: ul("error.noDefaultChannel") });
		}
		const guildMembers = await interaction.guild?.members.fetch();
		for (const [user, data] of Object.entries(members)) {
			//we already parsed the user, so the cache should be up to date
			let member: Djs.GuildMember | Djs.User | undefined = guildMembers!.get(user);
			if (!member || !member.user) {
				continue;
			}
			member = member.user as Djs.User;
			for (const char of data) {
				const userDataEmbed = createUserEmbed(
					ul,
					char.avatar ?? member.avatarURL() ?? member.defaultAvatarURL,
					member.id,
					char.userName ?? undefined
				);

				const statsEmbed = char.stats ? createStatsEmbed(ul) : undefined;
				let diceEmbed = guildTemplate.damage ? createDiceEmbed(ul) : undefined;
				//! important: As the bulk add can be for level upped characters, the value is not verified (min/max) & total points
				for (const [name, value] of Object.entries(char.stats ?? {})) {
					const validateValue = guildTemplate.statistics?.[name];
					const fieldValue = validateValue?.combinaison
						? `\`${validateValue.combinaison}\` = ${value}`
						: `\`${value}\``;
					statsEmbed!.addFields({
						name: name.capitalize(),
						value: fieldValue,
						inline: true,
					});
				}
				for (const [name, dice] of Object.entries(guildTemplate.damage ?? {})) {
					diceEmbed!.addFields({
						name: name.capitalize(),
						value: `\`${dice}\``,
						inline: true,
					});
				}

				for (const [name, dice] of Object.entries(char.damage ?? {})) {
					if (!diceEmbed) diceEmbed = createDiceEmbed(ul);
					diceEmbed!.addFields({
						name: name.capitalize(),
						value: `\`${dice}\``,
						inline: true,
					});
				}

				let templateEmbed: Djs.EmbedBuilder | undefined = undefined;
				if (guildTemplate.diceType || guildTemplate.critical) {
					templateEmbed = new Djs.EmbedBuilder()
						.setTitle(ul("embed.template"))
						.setColor("DarkerGrey");
					templateEmbed.addFields({
						name: ul("common.dice").capitalize(),
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
				const allEmbeds = createEmbedsList(
					userDataEmbed,
					statsEmbed,
					diceEmbed,
					templateEmbed
				);
				await repostInThread(
					allEmbeds,
					interaction,
					char,
					member.id,
					ul,
					{ stats: !!statsEmbed, dice: !!diceEmbed, template: !!templateEmbed },
					client.settings,
					char.channel ??
						(char.private && privateChannel ? privateChannel : defaultChannel)
				);
				addAutoRole(interaction, member.id, !!diceEmbed, !!statsEmbed, client.settings);
				await reply(interaction, {
					content: ul("import.success", { user: Djs.userMention(member.id) }),
				});
			}
		}
		let msg = ul("import.all_success");
		if (errors.length > 0) msg += `\n${ul("import.errors.global")}\n${errors.join("\n")}`;
		await reply(interaction, { content: msg });
		return;
	},
};

/** Allow to create a CSV file for easy edition
 * Need to be opened by excel or google sheet because CSV is not the best in notepad
 */

export const bulkAddTemplate = {
	data: new Djs.SlashCommandBuilder()
		.setName(t("csv_generation.name"))
		.setDMPermission(false)
		.setDefaultMemberPermissions(Djs.PermissionFlagsBits.ManageRoles)
		.setNameLocalizations(cmdLn("csv_generation.name"))
		.setDescription(t("csv_generation.description"))
		.setDescriptionLocalizations(cmdLn("csv_generation.description")),
	async execute(interaction: Djs.CommandInteraction, client: EClient) {
		if (!interaction.guild) return;
		const lang =
			client.settings.get(interaction.guild.id, "lang") ??
			interaction.guild.preferredLocale ??
			interaction.locale;
		const ul = ln(lang);
		const guildTemplate = await getTemplateWithDB(interaction, client.settings);
		if (!guildTemplate) {
			return reply(interaction, { content: ul("error.noTemplate") });
		}
		const header = ["user", "charName", "avatar", "channel"];
		if (guildTemplate.statistics) {
			header.push(...Object.keys(guildTemplate.statistics));
		}
		if (client.settings.has(interaction.guild.id, "privateChannel"))
			header.push("isPrivate");
		header.push("dice");

		//create CSV
		const csvText = `\ufeff${header.join(";")}\n`;
		const buffer = Buffer.from(csvText, "utf-8");
		await interaction.reply({
			content: ul("csv_generation.success"),
			files: [{ attachment: buffer, name: "template.csv" }],
		});
	},
};
/**
 * Export a function to parse a CSV file and return the data, using PapaParse
 * @param url {string} The URL of the CSV file, or the content of the file as string
 * @param guildTemplate {StatisticalTemplate} The template of the guild
 * @param interaction {Djs.CommandInteraction | undefined} The interaction to reply to, if any (undefined if used in test)
 */
export async function parseCSV(
	url: string,
	guildTemplate: StatisticalTemplate,
	interaction?: Djs.CommandInteraction,
	allowPrivate?: boolean,
	lang: Djs.Locale = Djs.Locale.EnglishGB
) {
	let header = ["user", "charName", "avatar", "channel"];
	if (guildTemplate.statistics) {
		header = header.concat(Object.keys(guildTemplate.statistics));
	}
	if (allowPrivate) header.push("isPrivate");

	const ul = ln(lang);
	header.push("dice");
	header = header.map((key) => key.unidecode());
	//papaparse can't be used in Node, we need first to create a readable stream

	const csvText = url.startsWith("https://") ? await readCSV(url) : url;
	if (!csvText || csvText.length === 0) {
		throw new InvalidCsvContent("url");
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
				error = "Error while parsing CSV";
				return;
			}
			//throw error if missing header (it shouldn't not throw if a header is added)
			const dataHeader = results.meta.fields?.map((key) => key.unidecode());
			if (!dataHeader) {
				console.error("Error while parsing CSV, missing header");
				if (interaction)
					await reply(interaction, { content: ul("import.errors.missing_header") });
				error = "Missing header";
				return;
			}
			//throw error only if missing values for the header
			const missingHeader = header
				.filter((key) => !dataHeader.includes(key))
				.filter((key) => key !== "dice" && key !== "avatar" && key !== "channel");
			if (missingHeader.length > 0) {
				console.error("Error while parsing CSV, missing header values", missingHeader);
				if (interaction)
					await reply(interaction, {
						content: ul("import.errors.headers", { name: missingHeader.join("\n- ") }),
					});
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
		throw new InvalidCsvContent("url");
	}
	return await step(csvData, guildTemplate, interaction, allowPrivate, lang);
}

/**
 * Read the distant CSV file
 * @param url {string} The URL of the CSV file
 * @returns {Promise<string>}
 */
async function readCSV(url: string): Promise<string> {
	const response = await fetch(url);
	if (!response.ok) {
		throw new InvalidURL(url);
	}
	return response.text();
}

/**
 * Parse the csv file and return the data in the correct format
 * @param csv {CSVRow[]} The data parsed from the CSV file
 * @param guildTemplate {StatisticalTemplate} The template of the guild
 * @param interaction {Djs.CommandInteraction | undefined} The interaction to reply to, if any (undefined if used in test)
 */
async function step(
	csv: CSVRow[],
	guildTemplate: StatisticalTemplate,
	interaction?: Djs.CommandInteraction,
	allowPrivate?: boolean,
	lang: Djs.Locale = Djs.Locale.EnglishGB
) {
	const members: {
		[id: string]: UserData[];
	} = {};
	const ul = ln(lang);
	const errors: string[] = [];
	//get the user id from the guild
	for (const data of csv) {
		const user = data.user.replaceAll("'", "").trim();
		const channel = data.channel ? data.channel.replaceAll("'", "").trim() : undefined;
		const charName = data.charName;

		//get user from the guild
		let guildMember: undefined | Djs.GuildMember;
		let userID: string | undefined = user;
		const allMembers = await interaction?.guild?.members.fetch();
		if (!allMembers) {
			const msg = ul("import.errors.no_user");
			errors.push(msg);
			continue;
		}
		//get the user from the guild
		if (interaction) {
			guildMember = allMembers.find(
				(member) =>
					member.user.id === user ||
					member.user.username === user ||
					member.user.tag === user
			);
			if (!guildMember || !guildMember.user) {
				const msg = ul("import.errors.user_not_found", { user });
				await reply(interaction, { content: msg });
				errors.push(msg);
				continue;
			}
			userID = guildMember.id;
		}
		const isPrivate = data.isPrivate;

		if (!members[userID]) members[userID] = [];
		if (guildTemplate.charName && !charName) {
			if (interaction) {
				const msg = ul("import.errors.missing_charName", {
					user: Djs.userMention(userID),
				});
				await reply(interaction, { content: msg });
				errors.push(msg);
			}
			console.warn(`Missing character name for ${user}`);
			continue;
		}
		//prevent duplicate with verify the charName
		if (
			members[userID].find((char) => {
				if (char.userName && charName)
					return char.userName.unidecode() === charName.unidecode();
				return !char.userName && !charName;
			})
		) {
			if (interaction) {
				const msg = ul("import.errors.duplicate_charName", {
					user: Djs.userMention(userID),
					charName: charName ?? ul("common.default"),
				});
				await reply(interaction, { content: msg });
				errors.push(msg);
			}
			console.warn(`Duplicate character name for ${user}`);
			continue;
		}
		const stats: { [name: string]: number } = {};
		//get the stats
		if (guildTemplate.statistics) {
			const emptyStats = Object.keys(guildTemplate.statistics).filter(
				(key) => !data[key]
			);
			if (emptyStats.length > 0) {
				if (interaction) {
					const msg = ul("import.errors.missing_stats", {
						user: Djs.userMention(userID),
						stats: emptyStats.join("\n- "),
					});
					await reply(interaction, { content: msg });
					errors.push(msg);
				}
				console.warn(`Missing stats for ${user}. Missing: ${emptyStats.join("\n- ")}`);
				continue;
			}

			for (const key of Object.keys(guildTemplate.statistics)) {
				stats[key] = data[key] as number;
			}
		}
		const dice: { [name: string]: string } | undefined = data.dice?.replaceAll("'", "")
			? data.dice.split(/\r?\n/).reduce(
					(acc, line) => {
						const match = line.match(/-\s*([^:]+)\s*:\s*(.+)/);
						if (match) {
							const key = match[1].trim();
							acc[key] = match[2].trim();
						}
						return acc;
					},
					{} as { [name: string]: string }
				)
			: undefined;
		const newChar: UserData = {
			userName: charName,
			stats,
			template: {
				diceType: guildTemplate.diceType,
				critical: guildTemplate.critical,
			},
			private: allowPrivate ? isPrivate : undefined,
			damage: dice,
			avatar: data.avatar ?? undefined,
			channel,
		};
		logger.trace("Adding character", newChar);
		// biome-ignore lint/performance/noDelete: I need this because the file will be rewritten and the undefined value can broke object
		if (!newChar.private) delete newChar.private;
		// biome-ignore lint/performance/noDelete: I need this because the file will be rewritten and the undefined value can broke object
		if (!newChar.avatar) delete newChar.avatar;
		members[userID].push(newChar);
	}
	return { members, errors };
}
