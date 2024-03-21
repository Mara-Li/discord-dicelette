import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { TFunction } from "i18next";

export function editUserButtons(ul: TFunction<"translation", undefined>, stats?: boolean, dice?: boolean, template?: boolean) {
	const editUser = new ButtonBuilder()
		.setCustomId("edit_stats")
		.setLabel(ul("modals.edit.stats"))
		.setStyle(ButtonStyle.Primary);
	const editDice = new ButtonBuilder()
		.setCustomId("edit_dice")
		.setLabel(ul("modals.edit.dice"))
		.setStyle(ButtonStyle.Primary);
	const addDice = new ButtonBuilder()
		.setCustomId("add_dice")
		.setLabel(ul("modals.add.dice"))
		.setStyle(ButtonStyle.Primary);
	const editTemplate = new ButtonBuilder()
		.setCustomId("edit_template")
		.setLabel(ul("modals.edit.template"))
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
		.setLabel(ul("modals.continue"))
		.setStyle(ButtonStyle.Success);
	const cancelButton = new ButtonBuilder()
		.setCustomId("cancel")
		.setLabel(ul("modals.cancel"))
		.setStyle(ButtonStyle.Danger);
	return new ActionRowBuilder<ButtonBuilder>().addComponents([continueButton, cancelButton]);
}

export function registerDmgButton(ul: TFunction<"translation", undefined>) {
	const validateButton = new ButtonBuilder()
		.setCustomId("validate")
		.setLabel(ul("common.validate"))
		.setStyle(ButtonStyle.Success);
	const cancelButton = new ButtonBuilder()
		.setCustomId("cancel")
		.setLabel(ul("modals.cancel"))
		.setStyle(ButtonStyle.Danger);
	const registerDmgButton = new ButtonBuilder()
		.setCustomId("add_dice_first")
		.setLabel(ul("modals.register"))
		.setStyle(ButtonStyle.Primary);
	return new ActionRowBuilder<ButtonBuilder>().addComponents([registerDmgButton, validateButton, cancelButton]);
}