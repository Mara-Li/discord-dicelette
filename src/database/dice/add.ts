import { createDiceEmbed, getUserNameAndChar, verifyIfEmbedInDB } from "@database";
import { evalStatsDice } from "@dicelette/core";
import type { Settings, Translation, UserMessageId } from "@interface";
import { findKeyFromTranslation, lError, ln } from "@localization";
import { addAutoRole, removeEmojiAccents, reply, sendLogs, title } from "@utils";
import { editUserButtons, registerDmgButton } from "@utils/buttons";
import { getTemplateWithDB, getUserByEmbed, registerUser } from "@utils/db";
import { ensureEmbed, getEmbeds, removeBacktick } from "@utils/parse";
import {
	ActionRowBuilder,
	type ButtonInteraction,
	EmbedBuilder,
	type Guild,
	type Locale,
	type ModalActionRowComponentBuilder,
	ModalBuilder,
	type ModalSubmitInteraction,
	PermissionsBitField,
	TextInputBuilder,
	TextInputStyle,
	type User,
	userMention,
} from "discord.js";

/**
 * Interaction to add a new skill dice
 * @param interaction {ButtonInteraction}
 * @param ul {Translation}
 * @param interactionUser {User}
 */
export async function executeAddDiceButton(
	interaction: ButtonInteraction,
	ul: Translation,
	interactionUser: User,
	db: Settings
) {
	const embed = ensureEmbed(interaction.message);
	const user = embed.fields
		.find((field) => findKeyFromTranslation(field.name) === "common.user")
		?.value.replace("<@", "")
		.replace(">", "");
	const isSameUser = user === interactionUser.id;
	const isModerator = interaction.guild?.members.cache
		.get(interactionUser.id)
		?.permissions.has(PermissionsBitField.Flags.ManageRoles);
	const first = interaction.customId.includes("first");
	const userName = embed.fields.find((field) =>
		["common.character", "common.charName"].includes(findKeyFromTranslation(field.name))
	);
	const userNameValue =
		userName && findKeyFromTranslation(userName?.value) === "common.noSet"
			? undefined
			: userName?.value;
	if (!first && user) {
		const { isInDb, coord } = verifyIfEmbedInDB(
			db,
			interaction.message,
			user,
			userNameValue
		);
		if (!isInDb) {
			const urlNew = `https://discord.com/channels/${interaction.guild!.id}/${coord?.channelId}/${coord?.messageId}`;
			await reply(interaction, {
				content: ul("error.oldEmbed", { fiche: urlNew }),
				ephemeral: true,
			});
			//delete the message
			await interaction.message.delete();
			return;
		}
	}
	if (isSameUser || isModerator)
		showDamageDiceModals(interaction, interaction.customId.includes("first"));
	else await reply(interaction, { content: ul("modals.noPermission"), ephemeral: true });
}

/**
 * Modal to add a new skill dice
 * @param interaction {ButtonInteraction}
 * @param first {boolean}
 * - true: It's the modal when the user is registered
 * - false: It's the modal when the user is already registered and a new dice is added to edit the user
 */
export async function showDamageDiceModals(
	interaction: ButtonInteraction,
	first?: boolean
) {
	const ul = ln(interaction.locale as Locale);
	const id = first ? "damageDice_first" : "damageDice";
	const modal = new ModalBuilder().setCustomId(id).setTitle(ul("register.embed.damage"));
	const damageDice = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
		new TextInputBuilder()
			.setCustomId("damageName")
			.setLabel(ul("modals.dice.name"))
			.setPlaceholder(ul("modals.dice.placeholder"))
			.setRequired(true)
			.setValue("")
			.setStyle(TextInputStyle.Short)
	);
	const diceValue = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
		new TextInputBuilder()
			.setCustomId("damageValue")
			.setLabel(ul("modals.dice.value"))
			.setPlaceholder("1d5")
			.setRequired(true)
			.setValue("")
			.setStyle(TextInputStyle.Short)
	);
	modal.addComponents(damageDice);
	modal.addComponents(diceValue);
	await interaction.showModal(modal);
}

/**
 * Interaction to submit the new skill dice
 * Only works if the user is the owner of the user registered in the embed or if the user is a moderator
 * @param interaction {ModalSubmitInteraction}
 * @param ul {Translation}
 * @param interactionUser {User}
 */
export async function storeDamageDice(
	interaction: ModalSubmitInteraction,
	ul: Translation,
	interactionUser: User,
	db: Settings
) {
	const template = await getTemplateWithDB(interaction, db);
	if (!template) {
		await reply(interaction, { content: ul("error.noTemplate") });
		return;
	}
	const embed = ensureEmbed(interaction.message ?? undefined);
	const user =
		embed.fields
			.find((field) => findKeyFromTranslation(field.name) === "common.user")
			?.value.replace("<@", "")
			.replace(">", "") === interactionUser.id;
	const isModerator = interaction.guild?.members.cache
		.get(interactionUser.id)
		?.permissions.has(PermissionsBitField.Flags.ManageRoles);
	if (user || isModerator)
		await registerDamageDice(interaction, db, interaction.customId.includes("first"));
	else await reply(interaction, { content: ul("modals.noPermission"), ephemeral: true });
}
/**
 * Register the new skill dice in the embed and database
 * @param interaction {ModalSubmitInteraction}
 * @param first {boolean}
 * - true: It's the modal when the user is registered
 * - false: It's the modal when the user is already registered and a new dice is added to edit the user
 */
export async function registerDamageDice(
	interaction: ModalSubmitInteraction,
	db: Settings,
	first?: boolean
) {
	const ul = ln(interaction.locale as Locale);
	const name = interaction.fields.getTextInputValue("damageName");
	let value = interaction.fields.getTextInputValue("damageValue");
	if (!interaction.guild) throw new Error(ul("error.noGuild"));
	if (!interaction.message) throw new Error(ul("error.noMessage"));

	const oldDiceEmbeds = getEmbeds(
		ul,
		interaction.message ?? undefined,
		"damage"
	)?.toJSON();
	const diceEmbed = oldDiceEmbeds ? new EmbedBuilder(oldDiceEmbeds) : createDiceEmbed(ul);
	if (oldDiceEmbeds?.fields)
		for (const field of oldDiceEmbeds.fields) {
			//add fields only if not already in the diceEmbed
			if (
				diceEmbed
					.toJSON()
					.fields?.findIndex(
						(f) => removeEmojiAccents(f.name) === removeEmojiAccents(field.name)
					) === -1
			) {
				diceEmbed.addFields(field);
			}
		}
	const user = getUserByEmbed(interaction.message, ul, first);
	if (!user) throw new Error(ul("error.user")); //mean that there is no embed
	try {
		value = evalStatsDice(value, user.stats);
	} catch (error) {
		const errorMsg = lError(error as Error, interaction);
		await reply(interaction, { content: errorMsg, ephemeral: true });
		return;
	}
	if (
		diceEmbed
			.toJSON()
			.fields?.findIndex(
				(f) => removeEmojiAccents(f.name) === removeEmojiAccents(name)
			) === -1 ||
		!diceEmbed.toJSON().fields
	) {
		diceEmbed.addFields({
			name: title(name),
			value: `\`${value}\``,
			inline: true,
		});
	}
	const damageName = diceEmbed.toJSON().fields?.reduce(
		(acc, field) => {
			acc[field.name] = removeBacktick(field.value);
			return acc;
		},
		{} as { [name: string]: string }
	);
	if (damageName && Object.keys(damageName).length > 25) {
		await reply(interaction, { content: ul("modals.dice.max"), ephemeral: true });
		return;
	}
	const { userID, userName, thread } = await getUserNameAndChar(interaction, ul, first);
	await addAutoRole(
		interaction,
		userID,
		!!damageName && Object.keys(damageName).length > 0,
		false,
		db
	);
	if (!first) {
		const userEmbed = getEmbeds(ul, interaction.message ?? undefined, "user");
		if (!userEmbed) throw new Error("[error.noUser]"); //mean that there is no embed
		const statsEmbed = getEmbeds(ul, interaction.message ?? undefined, "stats");
		const templateEmbed = getEmbeds(ul, interaction.message ?? undefined, "template");
		const allEmbeds = [userEmbed];
		if (statsEmbed) allEmbeds.push(statsEmbed);
		allEmbeds.push(diceEmbed);
		if (templateEmbed) allEmbeds.push(templateEmbed);
		const components = editUserButtons(ul, !!statsEmbed, true);

		const userRegister: {
			userID: string;
			charName: string | undefined;
			damage: string[] | undefined;
			msgId: UserMessageId;
		} = {
			userID,
			charName: userName,
			damage: damageName ? Object.keys(damageName) : undefined,
			msgId: [interaction.message.id, interaction.message.channel.id],
		};
		registerUser(userRegister, interaction, db, false);
		await interaction?.message?.edit({ embeds: allEmbeds, components: [components] });
		await reply(interaction, { content: ul("modals.added.dice"), ephemeral: true });
		await sendLogs(
			ul("logs.dice.add", {
				user: userMention(interaction.user.id),
				fiche: interaction.message.url,
				char: `${userMention(userID)} ${userName ? `(${userName})` : ""}`,
			}),
			interaction.guild as Guild,
			db
		);
		return;
	}

	const components = registerDmgButton(ul);
	//get all other embeds from the old messages
	//remove the old dice embed
	//add the new dice embed
	const userEmbed = getEmbeds(ul, interaction.message ?? undefined, "user");
	if (!userEmbed) throw new Error("[error.noUser]"); //mean that there is no embed
	const statsEmbed = getEmbeds(ul, interaction.message ?? undefined, "stats");
	const allEmbeds = [userEmbed];
	if (statsEmbed) allEmbeds.push(statsEmbed);
	allEmbeds.push(diceEmbed);
	await interaction?.message?.edit({ embeds: allEmbeds, components: [components] });
	await reply(interaction, { content: ul("modals.added.dice"), ephemeral: true });

	await sendLogs(
		ul("logs.dice.add", {
			user: userMention(interaction.user.id),
			fiche: interaction.message.url,
			char: `${userMention(userID)} ${userName ? `(${userName})` : ""}`,
		}),
		interaction.guild as Guild,
		db
	);
	return;
}
