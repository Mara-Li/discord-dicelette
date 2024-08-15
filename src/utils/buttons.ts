import type { Translation } from "@interface";
import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder,
} from "discord.js";

/**
 * Button to edit the user embed character sheet
 * By default, only add the "add dice" button
 * @param ul {Translation}
 * @param stats {boolean} Only add it if true
 * @param dice {boolean} Only add the edit dice button it if true
 */
export function editUserButtons(ul: Translation, stats?: boolean, dice?: boolean) {
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
		return new ActionRowBuilder<ButtonBuilder>().addComponents([
			editUser,
			editDice,
			addDice,
		]);
	const components = [];
	if (stats) components.push(editUser);
	if (dice) components.push(editDice);
	components.push(addDice);
	return new ActionRowBuilder<ButtonBuilder>().addComponents(components);
}

export function selectEditMenu(ul: Translation) {
	const select = new StringSelectMenuBuilder()
		.setCustomId("edit_select")
		.setPlaceholder(ul("button.edit.select"))
		.addOptions(
			new StringSelectMenuOptionBuilder()
				.setLabel(ul("common.character").capitalize())
				.setEmoji("📝")
				.setValue("name")
				.setDescription(ul("button.name")),
			new StringSelectMenuOptionBuilder()
				.setLabel(ul("button.avatar.title"))
				.setValue("avatar")
				.setEmoji("🖼️")
				.setDescription(ul("button.avatar.description")),
			new StringSelectMenuOptionBuilder()
				.setLabel(ul("common.user"))
				.setValue("user")
				.setEmoji("👤")
				.setDescription(ul("button.user"))
		);
	return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
}

/**
 * Add the cancel and continue button when registering user and their are multiple page
 * @param ul {Translation}
 */
export function continueCancelButtons(ul: Translation) {
	const continueButton = new ButtonBuilder()
		.setCustomId("continue")
		.setLabel(ul("button.continue"))
		.setStyle(ButtonStyle.Success);
	const cancelButton = new ButtonBuilder()
		.setCustomId("cancel")
		.setLabel(ul("button.cancel"))
		.setStyle(ButtonStyle.Danger);
	return new ActionRowBuilder<ButtonBuilder>().addComponents([
		continueButton,
		cancelButton,
	]);
}

/**
 * Add the button for validating an user
 * @param ul {Translation}
 */
export function validateCancelButton(ul: Translation) {
	const validateButton = new ButtonBuilder()
		.setCustomId("validate")
		.setLabel(ul("button.validate"))
		.setStyle(ButtonStyle.Success);
	const cancelButton = new ButtonBuilder()
		.setCustomId("cancel")
		.setLabel(ul("button.cancel"))
		.setStyle(ButtonStyle.Danger);
	return new ActionRowBuilder<ButtonBuilder>().addComponents([
		validateButton,
		cancelButton,
	]);
}

/**
 * Button when registering the user, adding the "add dice" button
 * @param ul {Translation}
 */
export function registerDmgButton(ul: Translation) {
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
	return new ActionRowBuilder<ButtonBuilder>().addComponents([
		registerDmgButton,
		validateButton,
		cancelButton,
	]);
}
