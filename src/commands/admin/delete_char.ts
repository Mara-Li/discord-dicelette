import { deleteUser } from "@events/on_delete";
import type { PersonnageIds, UserMessageId } from "@interfaces/database";
import type { DiscordChannel, Translation } from "@interfaces/discord";
import { cmdLn, ln } from "@localization";
import { type EClient, logger } from "@main";
import { embedError, filterChoices, reply, searchUserChannel } from "@utils";
import { getDatabaseChar } from "@utils/db";
import * as Djs from "discord.js";
import i18next from "i18next";

const t = i18next.getFixedT("en");

export const deleteChar = {
	data: new Djs.SlashCommandBuilder()
		.setName(t("deleteChar.name"))
		.setDefaultMemberPermissions(Djs.PermissionFlagsBits.ManageRoles)
		.setNameLocalizations(cmdLn("deleteChar.name"))
		.setDescription(t("deleteChar.description"))
		.setDescriptionLocalizations(cmdLn("deleteChar.description"))
		.addUserOption((option) =>
			option
				.setName(t("display.userLowercase"))
				.setNameLocalizations(cmdLn("display.userLowercase"))
				.setDescription(t("deleteChar.user"))
				.setDescriptionLocalizations(cmdLn("deleteChar.user"))
				.setRequired(true)
		)
		.addStringOption((option) =>
			option
				.setName(t("common.character"))
				.setNameLocalizations(cmdLn("common.character"))
				.setDescriptionLocalizations(cmdLn("deleteChar.character"))
				.setDescription(t("deleteChar.character"))
				.setAutocomplete(true)
		),
	async autocomplete(
		interaction: Djs.AutocompleteInteraction,
		client: EClient
	): Promise<void> {
		const options = interaction.options as Djs.CommandInteractionOptionResolver;
		const fixed = options.getFocused(true);
		const guildData = client.settings.get(interaction.guildId as string);
		if (!guildData) return;
		const choices: string[] = [];
		const lang = guildData.lang ?? interaction.locale;
		const ul = ln(lang);
		let user = options.get(t("display.userLowercase"))?.value;
		if (typeof user !== "string") user = interaction.user.id;
		if (fixed.name === t("common.character")) {
			const guildChars = guildData.user[user];
			if (!guildChars) return;
			for (const data of guildChars) {
				choices.push(data.charName ? data.charName : ul("common.default"));
			}
		}
		if (choices.length === 0) return;
		const filter = filterChoices(choices, interaction.options.getFocused());
		await interaction.respond(
			filter.map((result) => ({ name: result.capitalize(), value: result }))
		);
	},
	async execute(interaction: Djs.CommandInteraction, client: EClient): Promise<void> {
		const options = interaction.options as Djs.CommandInteractionOptionResolver;
		const guildData = client.settings.get(interaction.guildId as string);
		const lang = guildData?.lang ?? interaction.locale;
		const ul = ln(lang);
		if (!guildData) {
			await reply(interaction, { embeds: [embedError(ul("error.noTemplate"), ul)] });
			return;
		}
		const user = options.getUser(t("display.userLowercase"));
		let charName = options.getString(t("common.character"))?.toLowerCase();
		const charData = await getDatabaseChar(interaction, client, t);

		if (!charName) {
			//delete all characters from the user
			const allDataUser = client.settings.get(
				interaction.guild!.id,
				`user.${user?.id ?? interaction.user.id}`
			);
			if (!allDataUser) {
				await reply(
					interaction,
					ul("deleteChar.noCharacters", {
						user: Djs.userMention(user?.id ?? interaction.user.id),
					})
				);
				return;
			}
			//list of all IDs of the messages to delete
			const idToDelete: UserMessageId[] = Object.values(allDataUser).map(
				(data) => data.messageId
			);

			await deleteMessage(idToDelete, client, interaction, ul);

			client.settings.delete(
				interaction.guild!.id,
				`user.${user?.id ?? interaction.user.id}`
			);
			await reply(
				interaction,
				ul("deleteChar.allSuccess", {
					user: Djs.userMention(user?.id ?? interaction.user.id),
				})
			);
			return;
		}
		if (!charData) {
			let userName = `<@${user?.id ?? interaction.user.id}>`;
			if (charName) userName += ` (${charName})`;
			await reply(interaction, {
				embeds: [embedError(ul("error.userNotRegistered", { user: userName }), ul)],
			});
			return;
		}
		charName = charName.includes(ul("common.default").toLowerCase())
			? undefined
			: charName;
		const userData = charData[user?.id ?? interaction.user.id];
		const sheetLocation: PersonnageIds = {
			channelId: userData.messageId[1],
			messageId: userData.messageId[0],
		};
		const userChannel: DiscordChannel | undefined = Array.isArray(userData.messageId)
			? await searchUserChannel(client.settings, interaction, ul, sheetLocation.channelId)
			: undefined;

		if (!userChannel) {
			const newGuildData = deleteUser(interaction, guildData, user, charName);
			client.settings.set(interaction.guildId as string, newGuildData);
			await reply(
				interaction,
				ul("deleteChar.success", {
					user: Djs.userMention(user?.id ?? interaction.user.id),
				})
			);
			return;
		}
		const messageID = sheetLocation.messageId;
		const msg = `${Djs.userMention(user?.id ?? interaction.user.id)}${charName ? ` *(${charName.capitalize()})*` : ""}`;
		try {
			//search for the message and delete it
			const message = await userChannel.messages.fetch(messageID);
			await message.delete();
			const newGuildData = deleteUser(interaction, guildData, user, charName);

			await reply(interaction, ul("deleteChar.success", { user: msg }));
			client.settings.set(interaction.guildId as string, newGuildData);
		} catch (e) {
			logger.warn(e, "deleteChar: no message found - No problem");
			//no message found, delete the character from the database
			const newGuildData = deleteUser(interaction, guildData, user, charName);
			client.settings.set(interaction.guildId as string, newGuildData);
			await reply(interaction, ul("deleteChar.success", { user: msg }));
		}
	},
};

async function deleteMessage(
	ids: UserMessageId[],
	client: EClient,
	interaction: Djs.CommandInteraction,
	ul: Translation
) {
	for (const id of ids) {
		const userThread = await searchUserChannel(client.settings, interaction, ul, id[1]);
		if (!userThread) continue;
		try {
			const message = await userThread.messages.fetch(id[1]);
			await message.delete();
		} catch (e) {
			logger.warn(e, "deleteChar: no message found - No problem");
		}
	}
}
