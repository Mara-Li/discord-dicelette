import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { TFunction } from "i18next";

export function editUserButtons(ul: TFunction<"translation", undefined>, stats?: boolean, dice?: boolean, template?: boolean) {
	const editUser = new ButtonBuilder()
		.setCustomId("edit_stats")
		.setLabel(ul("button.edit.stats"))
		.setStyle(ButtonStyle.Primary);
	const editDice = new ButtonBuilder()
		.setCustomId("edit_dice")
		.setLabel(ul("button.edit.dice"))
		.setStyle(ButtonStyle.Primary);
	const addDice = new ButtonBuilder()
		.setCustomId("add_dice")
		.setLabel(ul("button.dice"))
		.setStyle(ButtonStyle.Primary);
	const editTemplate = new ButtonBuilder()
		.setCustomId("edit_template")
		.setLabel(ul("button.edit.template"))
		.setStyle(ButtonStyle.Primary);
	if (stats && dice && template)	
		return new ActionRowBuilder<ButtonBuilder>().addComponents([editUser, editDice, addDice, editTemplate]);
	const components = [addDice];
	if (stats) components.push(editUser);
	if (dice) components.push(editDice);
	if (template) components.push(editTemplate);
	return new ActionRowBuilder<ButtonBuilder>().addComponents(components);
}

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