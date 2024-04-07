import { deleteUser } from "@events/on_delete";
import { cmdLn, ln } from "@localization";
import { EClient } from "@main";
import { filterChoices, reply, searchUserChannel, title } from "@utils";
import { getChar } from "@utils/db";
import { AutocompleteInteraction, CommandInteraction,CommandInteractionOptionResolver,Locale,PermissionFlagsBits,SlashCommandBuilder, userMention } from "discord.js";
import i18next from "i18next";

const t = i18next.getFixedT("en");

export const deleteChar = {
	data: new SlashCommandBuilder()
		.setName(t("deleteChar.name"))
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
		.setNameLocalizations(cmdLn("deleteChar.name"))
		.setDescription(t("deleteChar.description"))
		.setDescriptionLocalizations(cmdLn("deleteChar.description"))
		.addUserOption(option =>
			option
				.setName(t("display.userLowercase"))
				.setNameLocalizations(cmdLn("display.userLowercase"))
				.setDescription(t("deleteChar.user"))
				.setDescriptionLocalizations(cmdLn("deleteChar.user"))
				.setRequired(true)
		)
		.addStringOption(option =>
			option
				.setName(t("common.character"))
				.setNameLocalizations(cmdLn("common.character"))
				.setDescriptionLocalizations(cmdLn("deleteChar.character"))
				.setDescription(t("deleteChar.character"))
				.setAutocomplete(true)
		),
	async autocomplete(interaction: AutocompleteInteraction, client: EClient): Promise<void> {
		const options = interaction.options as CommandInteractionOptionResolver;
		const fixed = options.getFocused(true);
		const ul = ln(interaction.locale as Locale);
		const guildData = client.settings.get(interaction.guildId as string);
		if (!guildData) return;
		let choices: string[] = [];
		if (fixed.name === t("common.character")) {
			//get ALL characters from the guild
			const allCharactersFromGuild = Object.values(guildData.user)
				.map((data) => data.map((char) => char.charName ?? ""))
				.flat()
				.filter((data) => data.length > 0);
			allCharactersFromGuild.push(ul("common.default"));
			choices = allCharactersFromGuild;
		}
		if (choices.length === 0) return;
		const filter = filterChoices(choices, interaction.options.getFocused());
		await interaction.respond(
			filter.map(result => ({ name: title(result) ?? result, value: result}))
		);
	}, 	
	async execute(interaction: CommandInteraction, client: EClient): Promise<void> {
		const options = interaction.options as CommandInteractionOptionResolver;
		const guildData = client.settings.get(interaction.guildId as string);
		const ul = ln(interaction.locale as Locale);
		if (!guildData) {
			await reply(interaction, ul("error.noTemplate"));
			return;
		}
		const user = options.getUser(t("display.userLowercase"));
		const charName = options.getString(t("common.character"))?.toLowerCase();
		const thread = await searchUserChannel(client.settings, interaction, ul);

		if (!charName) {
			//delete all characters from the user
			const allDataUser = client.settings.get(interaction.guild!.id, `user.${user?.id ?? interaction.user.id}`);
			if (!allDataUser) {
				await reply(interaction, ul("deleteChar.noCharacters", {user: userMention(user?.id ?? interaction.user.id)}));
				return;
			}
			for (const char of allDataUser) {
				const mID = char.messageId;
				if (thread) {
					try {
						const message = await thread.messages.fetch(mID);
						await message.delete();
					} catch (error) {
						console.error(error);
					}
				}
			}
			client.settings.delete(interaction.guild!.id, `user.${user?.id ?? interaction.user.id}`);
			await reply(interaction, ul("deleteChar.allSuccess", {user: userMention(user?.id ?? interaction.user.id)}));
			return;
		}
		const charData = await getChar(interaction, client, t);
		if (!charData) {
			let userName = `<@${user?.id ?? interaction.user.id}>`;
			if (charName) userName += ` (${charName})` ;
			await reply(interaction, ul("error.userNotRegistered", {user: userName}));
			return;
		}
		if (!thread) {
			const newGuildData = deleteUser(interaction, guildData, user, charName);
			client.settings.set(interaction.guildId as string, newGuildData);
			return;
		}
		const messageID = charData[user?.id ?? interaction.user.id].messageId;
		const msg = `${userMention(user?.id ?? interaction.user.id)}: ${charName ? `(${charName})` : ""}`;
		try {
			//search for the message and delete it
			const message = await thread.messages.fetch(messageID);
			await message.delete();
			const newGuildData = deleteUser(interaction, guildData, user, charName);
			
			await reply(interaction, ul("deleteChar.success", {user: msg}));
			client.settings.set(interaction.guildId as string, newGuildData);
		} catch (error) {
			console.error(error);
			//no message found, delete the character from the database
			const newGuildData = deleteUser(interaction, guildData, user, charName);
			client.settings.set(interaction.guildId as string, newGuildData);
			await reply(interaction, ul("deleteChar.success", {user: msg}));	
		}
	}
};