import { autCompleteCmd, commandsList } from "@commands";
import { error } from "@console";
import { executeAddDiceButton, storeDamageDice } from "@interactions/add/dice";
import { initiateDiceEdit, validateDiceEdit } from "@interactions/edit/dice";
import type { StatisticalTemplate } from "@dicelette/core";
import type { Settings, Translation } from "@interface";
import { lError, ln } from "@localization";
import type { EClient } from "@main";
import {
	continuePage,
	startRegisterUser,
	pageNumber,
	recordFirstPage,
} from "@register/start";
import { validateUserButton } from "@register/validate";
import { editStats, triggerEditStats } from "@interactions/edit/stats";
import { embedError, reply } from "@utils";
import { getTemplate, getTemplateWithDB } from "@utils/db";
import { ensureEmbed } from "@utils/parse";
import {
	type AutocompleteInteraction,
	type BaseInteraction,
	type ButtonInteraction,
	type ModalSubmitInteraction,
	PermissionsBitField,
	type StringSelectMenuInteraction,
	TextChannel,
	type User,
} from "discord.js";
import { initiateAvatarEdit, validateAvatarEdit } from "@interactions/edit/avatar";
import { initiateRenaming, validateRename } from "@interactions/edit/rename";
import { initiateMove, validateMove } from "@interactions/edit/user";
import { resetButton } from "../commands/gimmick/edit";

export default (client: EClient): void => {
	client.on("interactionCreate", async (interaction: BaseInteraction) => {
		const ul = ln(interaction.guild?.preferredLocale ?? interaction.locale);
		const interactionUser = interaction.user;
		try {
			if (interaction.isCommand()) {
				const command = commandsList.find(
					(cmd) => cmd.data.name === interaction.commandName
				);
				if (!command) return;
				await command.execute(interaction, client);
			} else if (interaction.isAutocomplete()) {
				const interac = interaction as AutocompleteInteraction;
				const command = autCompleteCmd.find(
					(cmd) => cmd.data.name === interac.commandName
				);
				if (!command) return;
				await command.autocomplete(interac, client);
			} else if (interaction.isButton()) {
				let template = await getTemplate(interaction);
				template = template
					? template
					: await getTemplateWithDB(interaction, client.settings);
				if (!template) {
					await interaction.channel?.send({
						embeds: [embedError(ul("error.noTemplate"), ul)],
					});
					return;
				}
				await buttonSubmit(interaction, ul, interactionUser, template, client.settings);
			} else if (interaction.isModalSubmit())
				await modalSubmit(interaction, ul, interactionUser, client);
			else if (interaction.isStringSelectMenu())
				await selectSubmit(interaction, ul, interactionUser, client.settings);
		} catch (e) {
			error(e);
			if (!interaction.guild) return;
			const msgError = lError(e as Error, interaction);
			if (msgError.length === 0) return;
			const embed = embedError(msgError, ul);
			if (
				interaction.isButton() ||
				interaction.isModalSubmit() ||
				interaction.isCommand()
			)
				await reply(interaction, { embeds: [embed] });
			if (client.settings.has(interaction.guild.id)) {
				const db = client.settings.get(interaction.guild.id, "logs");
				if (!db) return;
				const logs = await interaction.guild.channels.fetch(db);
				if (logs instanceof TextChannel) {
					logs.send(`\`\`\`\n${(e as Error).message}\n\`\`\``);
				}
			}
		}
	});
};

/**
 * Switch for modal submission
 * @param interaction {ModalSubmitInteraction}
 * @param ul {Translation}
 * @param interactionUser {User}
 */
async function modalSubmit(
	interaction: ModalSubmitInteraction,
	ul: Translation,
	interactionUser: User,
	client: EClient
) {
	const db = client.settings;
	if (interaction.customId.includes("damageDice"))
		await storeDamageDice(interaction, ul, interactionUser, db);
	else if (interaction.customId.includes("page")) await pageNumber(interaction, ul, db);
	else if (interaction.customId === "editStats") await editStats(interaction, ul, db);
	else if (interaction.customId === "firstPage") await recordFirstPage(interaction, db);
	else if (interaction.customId === "editDice")
		await validateDiceEdit(interaction, ul, db);
	else if (interaction.customId === "editAvatar")
		await validateAvatarEdit(interaction, ul);
	else if (interaction.customId === "rename") validateRename(interaction, ul, client);
	else if (interaction.customId === "move") validateMove(interaction, ul, client);
}

/**
 * Switch for button interaction
 * @param interaction {ButtonInteraction}
 * @param ul {Translation}
 * @param interactionUser {User}
 * @param template {StatisticalTemplate}
 */
async function buttonSubmit(
	interaction: ButtonInteraction,
	ul: Translation,
	interactionUser: User,
	template: StatisticalTemplate,
	db: Settings
) {
	if (interaction.customId === "register")
		await startRegisterUser(
			interaction,
			template,
			interactionUser,
			ul,
			db.has(interaction.guild!.id, "privateChannel")
		);
	else if (interaction.customId === "continue")
		await continuePage(interaction, template, ul, interactionUser);
	else if (interaction.customId.includes("add_dice"))
		await executeAddDiceButton(interaction, interactionUser, db);
	else if (interaction.customId === "edit_stats")
		await triggerEditStats(interaction, ul, interactionUser, db);
	else if (interaction.customId === "validate")
		await validateUserButton(interaction, interactionUser, template, ul, db);
	else if (interaction.customId === "cancel")
		await cancel(interaction, ul, interactionUser);
	else if (interaction.customId === "edit_dice")
		await initiateDiceEdit(interaction, ul, interactionUser, db);
	else if (interaction.customId === "avatar") {
		await resetButton(interaction.message, ul);
		await interaction.reply({ content: ul("refresh"), ephemeral: true });
	}
}

async function selectSubmit(
	interaction: StringSelectMenuInteraction,
	ul: Translation,
	interactionUser: User,
	db: Settings
) {
	if (interaction.customId === "edit_select") {
		const value = interaction.values[0];
		if (value === "avatar")
			await initiateAvatarEdit(interaction, ul, interactionUser, db);
		else if (value === "name")
			await initiateRenaming(interaction, ul, interactionUser, db);
		else if (value === "user") await initiateMove(interaction, ul, interactionUser, db);
	}
}

/**
 * Interaction when the cancel button is pressed
 * Also prevent to cancel by user not autorized
 * @param interaction {ButtonInteraction}
 * @param ul {Translation}
 * @param interactionUser {User}
 */
async function cancel(
	interaction: ButtonInteraction,
	ul: Translation,
	interactionUser: User
) {
	const embed = ensureEmbed(interaction.message);
	const user =
		embed.fields
			.find((field) => field.name === ul("common.user"))
			?.value.replace("<@", "")
			.replace(">", "") === interactionUser.id;
	const isModerator = interaction.guild?.members.cache
		.get(interactionUser.id)
		?.permissions.has(PermissionsBitField.Flags.ManageRoles);
	if (user || isModerator) await interaction.message.edit({ components: [] });
	else await reply(interaction, { content: ul("modals.noPermission"), ephemeral: true });
}
