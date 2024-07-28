import {
	type AutocompleteInteraction,
	type Locale,
	SlashCommandBuilder,
	type CommandInteraction,
	type CommandInteractionOptionResolver,
	PermissionsBitField,
} from "discord.js";
import type { EClient } from "@main";
import i18next from "i18next";
import { cmdLn, ln } from "@localization";
import {
	embedError,
	filterChoices,
	haveAccess,
	reply,
	searchUserChannel,
	title,
} from "@utils";
import { getDatabaseChar } from "@utils/db";
import type { PersonnageIds } from "@interface";
import { getEmbeds, getEmbedsList } from "../../utils/parse";
import { editUserButtons } from "../../utils/buttons";
import { verifyAvatarUrl } from "../../database/register/validate";

const t = i18next.getFixedT("en");
export const editAvatar = {
	data: new SlashCommandBuilder()
		.setName(t("edit_avatar.name"))
		.setDefaultMemberPermissions(0)
		.setNameLocalizations(cmdLn("edit_avatar.name"))
		.setDescription(t("edit_avatar.desc"))
		.setDescriptionLocalizations(cmdLn("edit_avatar.desc"))
		.addStringOption((option) =>
			option
				.setName(t("edit_avatar.url.name"))
				.setNameLocalizations(cmdLn("edit_avatar.url.name"))
				.setDescription(t("edit_avatar.url.desc"))
				.setDescriptionLocalizations(cmdLn("edit_avatar.url.desc"))
				.setRequired(true)
		)
		.addUserOption((option) =>
			option
				.setName(t("display.userLowercase"))
				.setNameLocalizations(cmdLn("display.userLowercase"))
				.setDescription(t("edit_avatar.user"))
				.setDescriptionLocalizations(cmdLn("edit_avatar.user"))
		)
		.addStringOption((option) =>
			option
				.setName(t("common.character"))
				.setNameLocalizations(cmdLn("common.character"))
				.setDescriptionLocalizations(cmdLn("edit_avatar.character"))
				.setDescription(t("edit_avatar.character"))
				.setAutocomplete(true)
		),
	async autocomplete(interaction: AutocompleteInteraction, client: EClient) {
		const options = interaction.options as CommandInteractionOptionResolver;
		const fixed = options.getFocused(true);
		const guildData = client.settings.get(interaction.guildId as string);
		if (!guildData) return;
		const choices: string[] = [];
		const ul = ln(interaction.locale as Locale);
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
			choices.push(`${ul("common.default")}`);
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
			await reply(interaction, { embeds: [embedError(ul("error.noTemplate"), ul)] });
			return;
		}
		const user = options.getUser(t("display.userLowercase"));
		const isModerator = interaction.guild?.members.cache
			.get(interaction.user.id)
			?.permissions.has(PermissionsBitField.Flags.ManageRoles);

		if (user && user.id !== interaction.user.id && !isModerator) {
			await reply(interaction, { embeds: [embedError(ul("error.noPermission"), ul)] });
			return;
		}
		const charName = options.getString(t("common.character"))?.toLowerCase();
		const charData = await getDatabaseChar(interaction, client, t);
		if (!charData) {
			let userName = `<@${user?.id ?? interaction.user.id}>`;
			if (charName) userName += ` (${charName})`;
			await reply(interaction, {
				embeds: [embedError(ul("error.userNotRegistered", { user: userName }), ul)],
			});
			return;
		}
		const userData = charData[user?.id ?? interaction.user.id];
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
		if (!thread)
			return await reply(interaction, { embeds: [embedError(ul("error.noThread"), ul)] });

		const allowHidden = haveAccess(
			interaction,
			thread.id,
			user?.id ?? interaction.user.id
		);
		if (!allowHidden && charData[user?.id ?? interaction.user.id]?.isPrivate) {
			await reply(interaction, { embeds: [embedError(ul("error.private"), ul)] });
			return;
		}
		try {
			const imageURL = options.getString(t("edit_avatar.url.name"), true);
			if (imageURL.match(/(cdn|media)\.discordapp\.net/gi))
				return await reply(interaction, {
					embeds: [embedError(ul("error.avatar.discord"), ul)],
				});
			if (!verifyAvatarUrl(imageURL))
				return await reply(interaction, {
					embeds: [embedError(ul("error.avatar.url"), ul)],
				});
			const message = await thread.messages.fetch(sheetLocation.messageId);
			const embed = getEmbeds(ul, message, "user");
			if (!embed) throw new Error(ul("error.noEmbed"));
			embed.setThumbnail(imageURL);
			const embedsList = getEmbedsList(ul, { which: "user", embed }, message);
			//update button
			const oldsButtons = message.components;
			const haveEditAvatar = oldsButtons.some((row) =>
				row.components.some((button) => button.customId === "edit_avatar")
			);
			if (!haveEditAvatar) {
				const haveStats = oldsButtons.some((row) =>
					row.components.some((button) => button.customId === "edit_stats")
				);
				const haveDice = oldsButtons.some((row) =>
					row.components.some((button) => button.customId === "edit_dice")
				);
				const buttons = editUserButtons(ul, haveStats, haveDice);
				await message.edit({ embeds: embedsList.list, components: [buttons] });
			}
			await message.edit({ embeds: embedsList.list });
			const nameMention = `<@${user?.id ?? interaction.user.id}>${charName ? ` (${charName})` : ""}`;
			const msgLink = message.url;
			await reply(interaction, {
				content: ul("edit_avatar.success", { name: nameMention, link: msgLink }),
				ephemeral: true,
			});
		} catch (error) {
			await reply(interaction, { embeds: [embedError(ul("error.user"), ul)] });
		}
	},
};
