/**
 * Allow to add multiple people to the user database at once, using a CSV file.
 * The bot will register user as the other commands, with adding them into the user thread using {@link validateUser}
 */


import { createDiceEmbed, createStatsEmbed, createUserEmbed } from "@database";
import { StatisticalTemplate } from "@dicelette/core";
import { UserData } from "@interface";
import { cmdLn, ln } from "@localization";
import { EClient } from "@main";
import { removeEmojiAccents, reply, repostInThread, title } from "@utils";
import { getTemplateWithDB } from "@utils/db";
import { createEmbedsList } from "@utils/parse";
import {CommandInteraction, CommandInteractionOptionResolver, EmbedBuilder, GuildMember, Locale, PermissionFlagsBits,roleMention,SlashCommandBuilder,  userMention } from "discord.js";
import i18next from "i18next";
import Papa from "papaparse";

const t = i18next.getFixedT("en");

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
		if (!csvFile.name.endsWith(".csv")) {
			const ext = csvFile.name.split(".").pop();
			return reply(interaction, {content: ul("bulk_add.errors.invalid_file", { ext })});
		}
		/** download the file using paparse */
		const guildTemplate = await getTemplateWithDB(interaction, client.settings);
		if (!guildTemplate) {
			return reply(interaction, {content: ul("error.noTemplate")});
		}
		const members = await parseCSV(csvFile.url, guildTemplate, interaction);
		for (const [user, data] of Object.entries(members)) {
			//we already parsed the user, so the cache should be up to date
			const member = interaction.guild?.members.cache.get(user);
			if (!member || !member.user) {
				continue;
			}
			for (const char of data) {
				const userDataEmbed = createUserEmbed(ul, member.avatarURL() || "");
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
					if (!validateValue || !validateValue.combinaison) {
						statsEmbed!.addFields({
							name : title(name),
							value: `\`${value}\``,
							inline: true,
						});
					} else if (validateValue.combinaison) {
						statsEmbed!.addFields({
							name : title(name),
							value: `\`${validateValue.combinaison}\` = ${value}`,
							inline: true,
						});
					} else continue;
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
				if (client.settings.has(interaction.guild!.id, "autoRole")) {
					if (diceEmbed) {
						const role = client.settings.get(interaction.guild!.id, "autoRole.dice") as string;
						if (role) await interaction.guild!.members.cache.get(member.id)?.roles.add(roleMention(role));
					}
					if (statsEmbed) {
						const role = client.settings.get(interaction.guild!.id, "autoRole.stats") as string;
						if (role) await interaction.guild!.members.cache.get(member.id)?.roles.add(roleMention(role));
					}
				}
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

export async function parseCSV(url: string, guildTemplate: StatisticalTemplate, interaction?: CommandInteraction) {
	const ul = ln(interaction?.locale ?? "en" as Locale);
	const members: {
		[id: string]: UserData[];
	} = {};
	type CSVRow = {
		user: string;
		charName: string | undefined;
		[key: string]: string | number | undefined;
	};
	let header = [
		"user",
		"charName",
	];
	if (guildTemplate.statistics) {
		header = header.concat(Object.keys(guildTemplate.statistics));
	}
	if (guildTemplate.damage) {
		header = header.concat(Object.keys(guildTemplate.damage));
	}
	header = header.map(key => removeEmojiAccents(key));
	//papaparse can't be used in Node, we need first to create a readable stream
	const csvText = await readCSV(url);
	if (!csvText) {
		throw new Error("Invalid URL");
	}
	Papa.parse(csvText.replaceAll(/\s+;\s*/gi, ";"), {
		header: true,
		dynamicTyping: true,
		skipEmptyLines: true,
		//in case the file was wrongly parsed, we need to trim the space before and after the key
		async step(row) {
			//get the result row by row
			//trim "\t" if there is any in key & value
			const data = row.data as CSVRow;
			const metaHeader = row.meta.fields?.map(key => removeEmojiAccents(key));
			if (!metaHeader) {
				return;
			}
			//verify that the header is correct
			if (header.some(key => !metaHeader.includes(key))) {
				return;
			}
			//get the user id from the guild
			const user = data.user;
			const charName = data.charName;
			//get user from the guild
			let guildMember: undefined | GuildMember;
			let userID: string | undefined = data.user;
			if (interaction) {
				guildMember = (await interaction.guild!.members.fetch({query: user})).first();
				if (!guildMember || !guildMember.user) {
					return;
				}
				userID = guildMember.id;
			} 
			if (!members[userID]) members[userID] = [];
			//prevent duplicate with verify the charName
			if (members[userID].find(char => {
				if (char.userName && charName) return removeEmojiAccents(char.userName) === removeEmojiAccents(charName);
				else if (!char.userName && !charName) return true;
				else return false;
			})) {
				return;
			}
			const stats: {[name: string]: number} = {};
			//get the stats
			if (guildTemplate.statistics) {
				Object.keys(guildTemplate.statistics).forEach(key => {
					stats[key] = data[key] as number;
				});
			}
			
			members[userID].push({
				userName: charName,
				stats,
				template: {
					diceType: guildTemplate.diceType,
					critical: guildTemplate.critical,
				},
			});
		},
		async complete(result) {
			if (interaction)
				await reply(interaction, {content: ul("bulk_add.success")});
			else console.log("Bulk add success", result.data);
		}
	});
	return members;
}

async function readCSV(url: string) {
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error("Invalid URL");
	}
	return response.text();

}