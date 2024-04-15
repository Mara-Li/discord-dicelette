import { createDiceEmbed, createStatsEmbed } from "@database";
import { cmdLn,ln } from "@localization";
import { EClient } from "@main";
import { filterChoices, reply, searchUserChannel, title } from "@utils";
import { getDatabaseChar } from "@utils/db";
import { getEmbeds } from "@utils/parse";
import { AutocompleteInteraction, CommandInteraction, CommandInteractionOptionResolver, EmbedBuilder, Locale, SlashCommandBuilder } from "discord.js";
import i18next from "i18next";

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
		const choices: string[] = [];
		let userID = options.get(t("display.userLowercase"))?.value ?? interaction.user.id;
		if (typeof userID !== "string") userID = interaction.user.id;
		if (fixed.name === t("common.character")) {
			const guildChars = guildData.user[userID];
			if (!guildChars) return;
			for (const data of guildChars) {
				if (data.charName)
					choices.push(data.charName);
			}
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
		const charData = await getDatabaseChar(interaction, client, t);
		const charName = options.getString(t("common.character"))?.toLowerCase();
		if (!charData) {
			let userName = `<@${user?.id ?? interaction.user.id}>`;
			if (charName) userName += ` (${charName})` ;
			await reply(interaction, ul("error.userNotRegistered", {user: userName}));
			return;
		}
		const thread = await searchUserChannel(client.settings, interaction, ul);
		const messageID = charData[user?.id ?? interaction.user.id].messageId;
		try {
			const userMessage = await thread?.messages.fetch(messageID);
			const statisticEmbed = getEmbeds(ul, userMessage, "stats");
			const diceEmbed = getEmbeds(ul, userMessage, "damage");
			const diceFields = diceEmbed?.toJSON().fields;
			const statsFields = statisticEmbed?.toJSON().fields;
			if (!statisticEmbed && !diceEmbed && !diceFields && !statsFields) {
				await reply(interaction, ul("error.user"));
				return;
			}
			const displayEmbed = new EmbedBuilder()
				.setTitle(ul("embed.display"))
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
			const newStatEmbed: EmbedBuilder | undefined = statsFields ? createStatsEmbed(ul).addFields(statsFields) : undefined;	
			const newDiceEmbed = diceFields ? createDiceEmbed(ul).addFields(diceFields) : undefined;
			const displayEmbeds : EmbedBuilder[] = [displayEmbed];
			if (newStatEmbed) displayEmbeds.push(newStatEmbed);
			if (newDiceEmbed) displayEmbeds.push(newDiceEmbed);
			await reply(interaction, { embeds: displayEmbeds });
		} catch (error) {
			await reply(interaction, ul("error.noMessage"));
			return;
		}
		
	}
};