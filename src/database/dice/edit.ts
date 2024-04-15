import { createDiceEmbed, getUserNameAndChar } from "@database";
import { evalStatsDice,roll } from "@dicelette/core";
import { Settings, Translation } from "@interface";
import { displayOldAndNewStats, parseStatsString, removeEmojiAccents, reply, sendLogs, title } from "@utils";
import { editUserButtons } from "@utils/buttons";
import { registerUser } from "@utils/db";
import { ensureEmbed,getEmbeds, getEmbedsList, parseEmbedFields, removeEmbedsFromList } from "@utils/parse";
import { ActionRowBuilder, APIEmbedField, ButtonInteraction, Embed, Guild, ModalActionRowComponentBuilder, ModalBuilder, ModalSubmitInteraction, PermissionsBitField, TextInputBuilder, TextInputStyle, User, userMention } from "discord.js";

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
			.setValue(dices),
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
export async function validate_editDice(interaction: ModalSubmitInteraction, ul: Translation, db: Settings) {
	if (!interaction.message) return;
	const diceEmbeds = getEmbeds(ul, interaction?.message ?? undefined, "damage");
	if (!diceEmbeds) return;
	const values = interaction.fields.getTextInputValue("allDice");
	const valuesAsDice = values.split("\n- ").map(dice => {
		const [name, value] = dice.split(/ ?: ?/);
		return { name: name.replace("- ", "").trim().toLowerCase(), value };
	});
	const dices = valuesAsDice.reduce((acc, { name, value }) => {
		acc[name] = value;
		return acc;
	}, {} as {[name: string]: string});
	const newEmbedDice: APIEmbedField[] = [];
	for (const [skill, dice] of Object.entries(dices)) {
		//test if dice is valid
		if (newEmbedDice.find(field => removeEmojiAccents(field.name) === removeEmojiAccents(skill))) continue;
		if (dice === "X" 
			|| dice.trim().length ===0 
			|| dice === "0" ) {
			newEmbedDice.push({
				name: title(skill),
				value: "X",
				inline: true
			});
			continue;
		}
		const statsEmbeds = getEmbeds(ul, interaction?.message ?? undefined, "stats");
		if (!statsEmbeds) {
			if (!roll(dice)) {
				throw new Error(ul("error.invalidDice.withDice", {dice}));
			}
			continue;
		} 
		const statsValues = parseStatsString(statsEmbeds);
		const diceEvaluated = evalStatsDice(dice, statsValues);
		newEmbedDice.push({
			name: title(skill),
			value: diceEvaluated,
			inline: true
		});
	}
	const oldDice = diceEmbeds.toJSON().fields;
	if (oldDice) {
		for (const field of oldDice) {
			const name = field.name.toLowerCase();
			if (!newEmbedDice.find(field => removeEmojiAccents(field.name) === removeEmojiAccents(name))) {
			//register the old value
				newEmbedDice.push({
					name: title(name),
					value: field.value,
					inline: true
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
			fieldsToAppend.find(f => removeEmojiAccents(f.name) === removeEmojiAccents(name)) 
			|| dice === "X" 
			|| dice.trim().length ===0 
			|| dice === "0" ) continue;
		fieldsToAppend.push(field);
	}
	const diceEmbed = createDiceEmbed(ul).addFields(fieldsToAppend);
	const {userID, userName, thread} = await getUserNameAndChar(interaction, ul);	
	if (!fieldsToAppend || fieldsToAppend.length === 0) {
		//dice was removed
		const embedsList = getEmbedsList(ul, {which: "damage", embed: diceEmbed}, interaction.message);
		const toAdd = removeEmbedsFromList(embedsList.list, "damage", ul);
		const components = editUserButtons(ul, embedsList.exists.stats, false);
		await interaction.message.edit({ embeds: toAdd, components: [components] });
		await reply(interaction,{ content: ul("modals.removed.dice"), ephemeral: true });
		registerUser(userID, interaction, interaction.message.id, thread, db, userName, undefined, false);
		await sendLogs(ul("logs.dice.remove", {user: userMention(interaction.user.id), fiche: interaction.message.url, char: `${userMention(userID)} ${userName ? `(${userName})` : ""}`}), interaction.guild as Guild, db);
		return;
	} else if (fieldsToAppend.length > 25) {
		await reply(interaction,{ content: ul("error.tooMuchDice"), ephemeral: true });
		return;
	}
	const skillDiceName = Object.keys(fieldsToAppend.reduce((acc, field) => {
		acc[field.name] = field.value;
		return acc;
	}, {} as {[name: string]: string}));
	registerUser(userID, interaction, interaction.message.id, thread, db, userName, skillDiceName, false);
	const embedsList = getEmbedsList(ul, {which: "damage", embed: diceEmbed}, interaction.message);
	await interaction.message.edit({ embeds: embedsList.list });
	await reply(interaction,{ content: ul("embeds.edit.dice"), ephemeral: true });
	const compare = displayOldAndNewStats(diceEmbeds.toJSON().fields, fieldsToAppend);
	const logMessage = ul("logs.dice.edit", {
		user: userMention(interaction.user.id), 
		fiche: interaction.message.url, 
		char: `${userMention(userID)} ${userName ? `(${userName})` : ""}`}
	);
	await sendLogs(`${logMessage}\n${compare}`, interaction.guild as Guild, db);
}

/**
 * Start the showEditDice when the button is interacted
 * It will also verify if the user can edit their dice 
 * @param interaction {ButtonInteraction}
 * @param ul {Translation}
 * @param interactionUser {User}
 */
export async function start_edit_dice(interaction: ButtonInteraction, ul: Translation, interactionUser: User) {
	const embed = ensureEmbed(interaction.message);
	const user = embed.fields.find(field => field.name === ul("common.user"))?.value.replace("<@", "").replace(">", "") === interactionUser.id;
	const isModerator = interaction.guild?.members.cache.get(interactionUser.id)?.permissions.has(PermissionsBitField.Flags.ManageRoles);
	if (user || isModerator)
		await showEditDice(interaction, ul);
	else await reply(interaction,{ content: ul("modals.noPermission"), ephemeral: true });
}

