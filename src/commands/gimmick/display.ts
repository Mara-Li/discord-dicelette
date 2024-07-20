import { createDiceEmbed, createStatsEmbed } from "@database";
import { cmdLn, findln, ln } from "@localization";
import type { EClient } from "@main";
import { filterChoices, haveAccess, reply, searchUserChannel, title } from "@utils";
import { getDatabaseChar } from "@utils/db";
import { getEmbeds } from "@utils/parse";
import { error } from "@console";
import {
	type APIEmbedField,
	type AutocompleteInteraction,
	type CommandInteraction,
	type CommandInteractionOptionResolver,
	EmbedBuilder,
	type Locale,
	SlashCommandBuilder,
} from "discord.js";
import i18next from "i18next";
import type { PersonnageIds } from "@interface";

const t = i18next.getFixedT("en");

export const displayUser = {
	data: new SlashCommandBuilder()
		.setName(t("display.title"))
		.setDescription(t("display.description"))
		.setNameLocalizations(cmdLn("display.title"))
		.setDefaultMemberPermissions(0)
		.setDescriptionLocalizations(cmdLn("display.description"))
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
		),
	async autocomplete(
		interaction: AutocompleteInteraction,
		client: EClient
	): Promise<void> {
		const options = interaction.options as CommandInteractionOptionResolver;
		const fixed = options.getFocused(true);
		const guildData = client.settings.get(interaction.guildId as string);
		if (!guildData) return;
		const choices: string[] = [];
		let userID = options.get(t("display.userLowercase"))?.value ?? interaction.user.id;
		if (typeof userID !== "string") userID = interaction.user.id;
		if (fixed.name === t("common.character")) {
			const guildChars = guildData.user[userID];
			if (!guildChars) return;
			for (const data of guildChars) {
				const allowed = haveAccess(interaction, data.messageId[1], userID);
				if (data.charName) {
					if (!data.isPrivate) choices.push(data.charName);
					else if (allowed) choices.push(data.charName);
				}
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
		const guildData = client.settings.get(interaction.guildId as string);
		const ul = ln(interaction.locale as Locale);
		if (!guildData) {
			await reply(interaction, ul("error.noTemplate"));
			return;
		}
		const user = options.getUser(t("display.userLowercase"));
		const charData = await getDatabaseChar(interaction, client, t);
		const charName = options.getString(t("common.character"))?.toLowerCase();
		if (!charData) {
			let userName = `<@${user?.id ?? interaction.user.id}>`;
			if (charName) userName += ` (${charName})`;
			await reply(interaction, ul("error.userNotRegistered", { user: userName }));
			return;
		}
		
		let userData = charData?.[user?.id ?? interaction.user.id];
		if (!userData) { /* search based on the character name */
			const findChara = Object.values(charData).find((data) => data.charName === charName);
			if (!findChara) {
				await reply(interaction, ul("error.user"));
				return;
			}
			userData = findChara;
		}
		const sheetLocation: PersonnageIds = {
			channelId: userData.messageId[1],
			messageId: userData.messageId[0],
		};
		const thread = await searchUserChannel(
			client.settings,
			interaction,
			ul,
			sheetLocation?.channelId
		);
		if (!thread) return await reply(interaction, ul("error.noThread"));

		const allowHidden = haveAccess(
			interaction,
			thread.id,
			user?.id ?? interaction.user.id
		);
		if (!allowHidden && charData[user?.id ?? interaction.user.id]?.isPrivate) {
			await reply(interaction, ul("error.private"));
			return;
		}
		try {
			const userMessage = await thread?.messages.fetch(sheetLocation.messageId);
			const statisticEmbed = getEmbeds(ul, userMessage, "stats");
			const diceEmbed = getEmbeds(ul, userMessage, "damage");
			const diceFields = diceEmbed?.toJSON().fields;
			const statsFields = statisticEmbed?.toJSON().fields;
			const dataUserEmbeds = getEmbeds(ul, userMessage, "user");
			if (!statisticEmbed && !diceEmbed && !diceFields && !statsFields) {
				await reply(interaction, ul("error.user"));
				return;
			}
			const jsonDataUser = dataUserEmbeds!.toJSON().fields!.find(x =>findln(x.name) === findln("common.user"));
			const jsonDataChar = dataUserEmbeds!.toJSON().fields!.find(x =>findln(x.name) === findln("common.character"));
			const displayEmbed = new EmbedBuilder()
				.setTitle(ul("embed.display"))
				.setThumbnail(
					dataUserEmbeds?.toJSON().thumbnail?.url ??
						user?.displayAvatarURL() ??
						interaction.user.displayAvatarURL()
				)
				.setColor("Gold")
				.addFields({
					name: ul("common.user"),
					value: jsonDataUser?.value ?? `<@${user?.id ?? interaction.user.id}>`,
					inline: true,
				})
				.addFields({
					name: title(ul("common.character")),
					value:
						jsonDataChar?.value ??
						title(userData.charName) ??
						ul("common.noSet"),
					inline: true,
				});
			const newStatEmbed: EmbedBuilder | undefined = statsFields
				? createStatsEmbed(ul).addFields(keepResultOnlyInFormula(statsFields))
				: undefined;
			const newDiceEmbed = diceFields
				? createDiceEmbed(ul).addFields(diceFields)
				: undefined;
			const displayEmbeds: EmbedBuilder[] = [displayEmbed];
			if (newStatEmbed) displayEmbeds.push(newStatEmbed);
			if (newDiceEmbed) displayEmbeds.push(newDiceEmbed);
			await reply(interaction, { embeds: displayEmbeds });
		} catch (e) {
			error(e);
			await reply(interaction, ul("error.noMessage"));
			return;
		}
	},
};

function keepResultOnlyInFormula(fields: APIEmbedField[]) {
	const newFields: APIEmbedField[] = [];
	for (const field of fields) {
		let value = field.value as string;
		if (value.includes("= ")) {
			value = `\`${value.split("= ")[1]}\``;
		}
		newFields.push({ ...field, value });
	}
	return newFields;
}
