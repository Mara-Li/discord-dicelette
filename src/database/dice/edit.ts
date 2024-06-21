import { allowEdit, createDiceEmbed, getUserNameAndChar } from "@database";
import { evalStatsDice, roll } from "@dicelette/core";
import type { Settings, Translation, UserMessageId, UserRegistration } from "@interface";
import {
	displayOldAndNewStats,
	parseStatsString,
	removeEmojiAccents,
	reply,
	sendLogs,
	title,
} from "@utils";
import { editUserButtons } from "@utils/buttons";
import { registerUser } from "@utils/db";
import {
	getEmbeds,
	getEmbedsList,
	parseEmbedFields,
	removeEmbedsFromList,
} from "@utils/parse";
import {
	ActionRowBuilder,
	type APIEmbedField,
	type ButtonInteraction,
	type Embed,
	type Guild,
	type ModalActionRowComponentBuilder,
	ModalBuilder,
	type ModalSubmitInteraction,
	TextInputBuilder,
	TextInputStyle,
	type User,
	userMention,
} from "discord.js";

/**
 * Show the modal to **edit** the registered dice
 * Will parse registered dice and show them in the modal as `- Skill : Dice`
 * @param interaction {ButtonInteraction}
 * @param ul {Translation}
 */
export async function showEditDice(interaction: ButtonInteraction, ul: Translation) {
	const diceEmbed = getEmbeds(ul, interaction.message, "damage");
	if (!diceEmbed) throw new Error(ul("error.invalidDice.embeds"));
	const diceFields = parseEmbedFields(diceEmbed.toJSON() as Embed);
	let dices = "";
	for (const [skill, dice] of Object.entries(diceFields)) {
		dices += `- ${skill}${ul("common.space")}: ${dice}\n`;
	}
	const modal = new ModalBuilder()
		.setCustomId("editDice")
		.setTitle(title(ul("common.dice")));
	const input = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
		new TextInputBuilder()
			.setCustomId("allDice")
			.setLabel(ul("modals.edit.dice"))
			.setRequired(true)
			.setStyle(TextInputStyle.Paragraph)
			.setValue(dices)
	);
	modal.addComponents(input);
	await interaction.showModal(modal);
}

/**
 * Validate the edit of the dice from the modals
 * Will parse the dice and validate if they are correct
 * Edit the embed with the new dice or remove it if it's empty
 * @param interaction {ModalSubmitInteraction}
 * @param ul {Translation}
 */
export async function validateDiceEdit(
	interaction: ModalSubmitInteraction,
	ul: Translation,
	db: Settings
) {
	if (!interaction.message) return;
	const diceEmbeds = getEmbeds(ul, interaction?.message ?? undefined, "damage");
	if (!diceEmbeds) return;
	const values = interaction.fields.getTextInputValue("allDice");
	const valuesAsDice = values.split("\n- ").map((dice) => {
		const [name, value] = dice.split(/ ?: ?/);
		return { name: name.replace("- ", "").trim().toLowerCase(), value };
	});
	const dices = valuesAsDice.reduce(
		(acc, { name, value }) => {
			acc[name] = value;
			return acc;
		},
		{} as { [name: string]: string }
	);
	const newEmbedDice: APIEmbedField[] = [];
	for (const [skill, dice] of Object.entries(dices)) {
		//test if dice is valid
		if (
			newEmbedDice.find(
				(field) => removeEmojiAccents(field.name) === removeEmojiAccents(skill)
			)
		)
			continue;
		if (dice === "X" || dice.trim().length === 0 || dice === "0") {
			newEmbedDice.push({
				name: title(skill),
				value: "X",
				inline: true,
			});
			continue;
		}
		const statsEmbeds = getEmbeds(ul, interaction?.message ?? undefined, "stats");
		if (!statsEmbeds) {
			if (!roll(dice)) {
				throw new Error(ul("error.invalidDice.withDice", { dice }));
			}
			continue;
		}
		const statsValues = parseStatsString(statsEmbeds);
		try {
			evalStatsDice(dice, statsValues);
		} catch (error) {
			throw new Error(ul("error.invalidDice.withDice", { dice }));
		}
		newEmbedDice.push({
			name: title(skill),
			value: `\`${dice}\``,
			inline: true,
		});
	}
	const oldDice = diceEmbeds.toJSON().fields;
	if (oldDice) {
		for (const field of oldDice) {
			const name = field.name.toLowerCase();
			if (
				!newEmbedDice.find(
					(field) => removeEmojiAccents(field.name) === removeEmojiAccents(name)
				)
			) {
				//register the old value
				newEmbedDice.push({
					name: title(name),
					value: `${field.value}`,
					inline: true,
				});
			}
		}
	}
	//remove duplicate
	const fieldsToAppend: APIEmbedField[] = [];
	for (const field of newEmbedDice) {
		const name = field.name.toLowerCase();
		const dice = field.value;
		if (
			fieldsToAppend.find(
				(f) => removeEmojiAccents(f.name) === removeEmojiAccents(name)
			) ||
			dice.toLowerCase() === "x" ||
			dice.trim().length === 0 ||
			dice === "0"
		)
			continue;
		fieldsToAppend.push(field);
	}
	const diceEmbed = createDiceEmbed(ul).addFields(fieldsToAppend);
	const { userID, userName, thread } = await getUserNameAndChar(interaction, ul);
	const messageID = [
		interaction.message.id,
		interaction.message.channelId,
	] as UserMessageId;
	if (!fieldsToAppend || fieldsToAppend.length === 0) {
		//dice was removed
		const embedsList = getEmbedsList(
			ul,
			{ which: "damage", embed: diceEmbed },
			interaction.message
		);
		const toAdd = removeEmbedsFromList(embedsList.list, "damage");
		const components = editUserButtons(ul, embedsList.exists.stats, false);
		await interaction.message.edit({ embeds: toAdd, components: [components] });
		await reply(interaction, { content: ul("modals.removed.dice"), ephemeral: true });

		const userRegister: UserRegistration = {
			userID,
			charName: userName,
			damage: undefined,
			msgId: messageID,
		};
		registerUser(userRegister, interaction, db, false);
		await sendLogs(
			ul("logs.dice.remove", {
				user: userMention(interaction.user.id),
				fiche: interaction.message.url,
				char: `${userMention(userID)} ${userName ? `(${userName})` : ""}`,
			}),
			interaction.guild as Guild,
			db
		);
		return;
	}
	const skillDiceName = Object.keys(
		fieldsToAppend.reduce(
			(acc, field) => {
				acc[field.name] = field.value;
				return acc;
			},
			{} as { [name: string]: string }
		)
	);
	const userRegister = {
		userID,
		charName: userName,
		damage: skillDiceName,
		msgId: messageID,
	};
	registerUser(userRegister, interaction, db, false);
	const embedsList = getEmbedsList(
		ul,
		{ which: "damage", embed: diceEmbed },
		interaction.message
	);
	await interaction.message.edit({ embeds: embedsList.list });
	await reply(interaction, { content: ul("embed.edit.dice"), ephemeral: true });
	const compare = displayOldAndNewStats(diceEmbeds.toJSON().fields, fieldsToAppend);
	const logMessage = ul("logs.dice.edit", {
		user: userMention(interaction.user.id),
		fiche: interaction.message.url,
		char: `${userMention(userID)} ${userName ? `(${userName})` : ""}`,
	});
	await sendLogs(`${logMessage}\n${compare}`, interaction.guild as Guild, db);
}

/**
 * Start the showEditDice when the button is interacted
 * It will also verify if the user can edit their dice
 * @param interaction {ButtonInteraction}
 * @param ul {Translation}
 * @param interactionUser {User}
 */
export async function initiateDiceEdit(
	interaction: ButtonInteraction,
	ul: Translation,
	interactionUser: User,
	db: Settings
) {
	if (await allowEdit(interaction, db, interactionUser))
		await showEditDice(interaction, ul);
}
