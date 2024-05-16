/**
 * Allow to add multiple people to the user database at once, using a CSV file.
 * The bot will register user as the other commands, with adding them into the user thread using {@link validateUser}
 */



import { StatisticalTemplate } from "@dicelette/core";
import { Translation, UserData } from "@interface";
import { cmdLn, ln } from "@localization";
import { EClient } from "@main";
import { removeEmojiAccents, reply, title } from "@utils";
import { channelMention, ChannelType, CommandInteraction, CommandInteractionOptionResolver, Embed, EmbedBuilder, PermissionFlagsBits,roleMention,SlashCommandBuilder, TextChannel, ThreadChannel, userMention } from "discord.js";
import i18next from "i18next";
import { parse } from "papaparse";

import { createDiceEmbed, createStatsEmbed, createUserEmbed } from "../../database";
import { getTemplateWithDB } from "../../utils/db";
import { createEmbedsList } from "../../utils/parse";

const t = i18next.getFixedT("en");

/**
 *! Note: Bulk data doesn't allow to register dice-per-user, as each user can have different dice
 * I don't want to think about a specific way to handle this, so I will just ignore it for now.
 */
export const command = {
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
		const members: {
			[id: string]: UserData[];
		} = {};
		const guildTemplate = await getTemplateWithDB(interaction, client.settings);
		if (!guildTemplate) {
			return reply(interaction, {content: ul("error.noTemplate")});
		}
		
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
		const templateStats = Object.keys(guildTemplate.statistics ?? {}) ;
		const damageDice = Object.keys(guildTemplate.damage ?? {});
		/**
		 * Should be:
		 * - user (ID/global name)
		 * - charName
		 * - statistics name (if any)
		 * - damage name (if any)
		 */
		type CSVRow = {
			user: string;
			charName: string | undefined;
			[key: string]: string | number | undefined;
		};
		parse(csvFile.url, {
			download: true,
			header: true,
			dynamicTyping: true,
			skipEmptyLines: true,
			async step(row) {
				//get the result row by row
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
				const member = (await interaction!.guild!.members.fetch({query: user})).first();
				if (!member || !member.user) {
					return;
				}
				
				//prevent duplicate with verify the charName
				if (members.user.find(char => char.userName === charName)) {
					return;
				}
				const stats: {[name: string]: number} = {};
				//get the stats
				if (guildTemplate.statistics) {
					Object.keys(guildTemplate.statistics).forEach(key => {
						stats[key] = data[key] as number;
					});
				}
				
				//add the data to the user
				members.user.push({
					userName: charName,
					stats,
					template: {
						diceType: guildTemplate.diceType,
						critical: guildTemplate.critical,
					},
				});
			},
			async complete(results) {
				await reply(interaction, {content: ul("bulk_add.success")});
			}
		});
		for (const [user, data] of Object.entries(members)) {
			const member = (await interaction!.guild!.members.fetch({query: user})).first();
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
				//! important: As the bulk add can be for level upped characters, the value is not verified (min/max)
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
				
			}
		}
	}
};