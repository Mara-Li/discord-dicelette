import { AutocompleteInteraction, CommandInteraction, CommandInteractionOptionResolver, EmbedBuilder, Locale, SlashCommandBuilder } from "discord.js";
import i18next from "i18next";

import { EClient } from "../..";
import { createDiceEmbed, createStatsEmbed } from "../../database";
import { cmdLn,ln } from "../../localizations";
import { filterChoices, reply, searchUserChannel, title } from "../../utils";
import { getEmbeds } from "../../utils/parse";

const t = i18next.getFixedT("en");

export const displayUser = {
	data: new SlashCommandBuilder()
		.setName(t("display.title"))
		.setDescription(t("display.description"))
		.setNameLocalizations(cmdLn("display.title"))
		.setDefaultMemberPermissions(0)
		.setDescriptionLocalizations(cmdLn("display.description"))
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
		),	
	async autocomplete(interaction: AutocompleteInteraction, client: EClient): Promise<void> {
		const options = interaction.options as CommandInteractionOptionResolver;
		const fixed = options.getFocused(true);
		const guildData = client.settings.get(interaction.guildId as string);
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
	async execute(interaction: CommandInteraction, client: EClient) {
		const options = interaction.options as CommandInteractionOptionResolver;
		const guildData = client.settings.get(interaction.guildId as string);
		const ul = ln(interaction.locale as Locale);
		if (!guildData) {
			await reply(interaction, ul("error.noTemplate"));
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
			const userData = client.settings.get(interaction.guild!.id, `user.${user?.id ?? interaction.user.id}`);
			let findChara = userData?.find((char) => char.charName === charName);
			//take the first in userData
			findChara = userData?.[0];
			if (!findChara) {
				let userName = `<@${user?.id ?? interaction.user.id}>`;
				if (charName) userName += ` (${charName})` ;
				await reply(interaction, ul("error.userNotRegistered", {user: userName}));
				return;
			}
			charData = {
				[(user?.id ?? interaction.user.id)]: findChara
			};
		} 
		const thread = await searchUserChannel(client.settings, interaction, ul);
		const messageID = charData[user?.id ?? interaction.user.id].messageId;
		try {
			const userMessage = await thread?.messages.fetch(messageID);
			const statisticEmbed = getEmbeds(ul, userMessage, "stats");
			const diceEmbed = getEmbeds(ul, userMessage, "damage");
			const diceFields = diceEmbed?.toJSON().fields;
			const statsFields = statisticEmbed?.toJSON().fields;
			if (!statisticEmbed || !diceEmbed || !diceFields || !statsFields) {
				await reply(interaction, ul("error.user"));
				return;
			}
			const displayEmbed = new EmbedBuilder()
				.setTitle(ul("embeds.display.title"))
				.setThumbnail(user?.displayAvatarURL() ?? interaction.user.displayAvatarURL())
				.setColor("Gold")
				.addFields({
					name: ul("common.user"),
					value: `<@${user?.id ?? interaction.user.id}>`,
					inline: true
				})
				.addFields({
					name: ul("common.character"),
					value: charData[user?.id ?? interaction.user.id].charName ?? ul("common.noSet"),
					inline: true
				});
			const newStatEmbed = createStatsEmbed(ul).addFields(statsFields);
			const newDiceEmbed = createDiceEmbed(ul).addFields(diceFields);
			await reply(interaction, { embeds: [displayEmbed, newStatEmbed, newDiceEmbed] });	
		} catch (error) {
			await reply(interaction, ul("error.noMessage"));
			return;
		}
		
	}
};