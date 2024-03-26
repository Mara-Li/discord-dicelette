import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { TFunction } from "i18next";

/**
 * Button to edit the user embed character sheet
 * By default, only add the "add dice" button
 * @param ul {TFunction<"translation", undefined>}
 * @param stats {boolean} Only add it if true
 * @param dice {boolean} Only add the edit dice button it if true
 */
export function editUserButtons(ul: TFunction<"translation", undefined>, stats?: boolean, dice?: boolean) {
	const addDice = new ButtonBuilder()
		.setCustomId("add_dice")
		.setLabel(ul("button.dice"))
		.setEmoji("➕")	
		.setStyle(ButtonStyle.Primary);
	const editUser = new ButtonBuilder()
		.setCustomId("edit_stats")
		.setLabel(ul("button.edit.stats"))
		.setEmoji("📝")
		.setStyle(ButtonStyle.Secondary);
	const editDice = new ButtonBuilder()
		.setCustomId("edit_dice")
		.setLabel(ul("button.edit.dice"))
		.setEmoji("📝")
		.setStyle(ButtonStyle.Secondary);
	
	if (stats && dice)	
		return new ActionRowBuilder<ButtonBuilder>().addComponents([editUser, editDice, addDice]);
	const components = [addDice];
	if (stats) components.push(editUser);
	if (dice) components.push(editDice);
	return new ActionRowBuilder<ButtonBuilder>().addComponents(components);
}

/**
 * Add the cancel and continue button when registering user and their are multiple page
 * @param ul {TFunction<"translation", undefined>}
 */
export function continueCancelButtons(ul: TFunction<"translation", undefined>) {
	const continueButton = new ButtonBuilder()
		.setCustomId("continue")
		.setLabel(ul("button.continue"))
		.setStyle(ButtonStyle.Success);
	const cancelButton = new ButtonBuilder()
		.setCustomId("cancel")
		.setLabel(ul("button.cancel"))
		.setStyle(ButtonStyle.Danger);
	return new ActionRowBuilder<ButtonBuilder>().addComponents([continueButton, cancelButton]);
}

/**
 * Add the button for validating an user
 * @param ul {TFunction<"translation", undefined>}
 */
export function validateCancelButton(ul: TFunction<"translation", undefined>) {
	const validateButton = new ButtonBuilder()
		.setCustomId("validate")
		.setLabel(ul("button.validate"))
		.setStyle(ButtonStyle.Success);
	const cancelButton = new ButtonBuilder()
		.setCustomId("cancel")
		.setLabel(ul("button.cancel"))
		.setStyle(ButtonStyle.Danger);
	return new ActionRowBuilder<ButtonBuilder>().addComponents([validateButton, cancelButton]);
}

/**
 * Button when registering the user, adding the "add dice" button
 * @param ul {TFunction<"translation", undefined>}
 */
export function registerDmgButton(ul: TFunction<"translation", undefined>) {
	const validateButton = new ButtonBuilder()
		.setCustomId("validate")
		.setLabel(ul("button.validate"))
		.setStyle(ButtonStyle.Success);
	const cancelButton = new ButtonBuilder()
		.setCustomId("cancel")
		.setLabel(ul("button.cancel"))
		.setStyle(ButtonStyle.Danger);
	const registerDmgButton = new ButtonBuilder()
		.setCustomId("add_dice_first")
		.setLabel(ul("button.dice"))
		.setStyle(ButtonStyle.Primary);
	return new ActionRowBuilder<ButtonBuilder>().addComponents([registerDmgButton, validateButton, cancelButton]);
}