import { autCompleteCmd, commandsList } from "@commands";
import {commandMenu, desktopLink, mobileLink} from "@commands/context-menu";
import { resetButton } from "@commands/gimmick/edit";
import type { StatisticalTemplate } from "@dicelette/core";
import { executeAddDiceButton, storeDamageDice } from "@interactions/add/dice";
import { initiateAvatarEdit, validateAvatarEdit } from "@interactions/edit/avatar";
import { initiateDiceEdit, validateDiceEdit } from "@interactions/edit/dice";
import { initiateRenaming, validateRename } from "@interactions/edit/rename";
import { editStats, triggerEditStats } from "@interactions/edit/stats";
import { initiateMove, validateMove } from "@interactions/edit/user";
import type { Settings, Translation } from "@interfaces/discord";
import { lError, ln } from "@localization";
import type { EClient } from "@main";
import {
	continuePage,
	pageNumber,
	recordFirstPage,
	startRegisterUser,
} from "@register/start";
import { validateUserButton } from "@register/validate";
import { embedError, reply } from "@utils";
import { getTemplate, getTemplateWithDB } from "@utils/db";
import { ensureEmbed } from "@utils/parse";
import * as Djs from "discord.js";

export default (client: EClient): void => {
	client.on("interactionCreate", async (interaction: Djs.BaseInteraction) => {
		const langToUse =
			client.settings.get(interaction.guild!.id, "lang") ??
			interaction.guild?.preferredLocale ??
			interaction.locale;
		const ul = ln(langToUse);
		const interactionUser = interaction.user;
		try {
			if (interaction.isMessageContextMenuCommand()) {
				await commandMenu(interaction, client);
			} else if (interaction.isCommand()) {
				const command = commandsList.find(
					(cmd) => cmd.data.name === interaction.commandName
				);
				if (!command) return;
				await command.execute(interaction, client);
			} else if (interaction.isAutocomplete()) {
				const autocompleteInteraction = interaction as Djs.AutocompleteInteraction;
				const command = autCompleteCmd.find(
					(cmd) => cmd.data.name === autocompleteInteraction.commandName
				);
				if (!command) return;
				await command.autocomplete(autocompleteInteraction, client);
			} else if (interaction.isButton()) {
				let template = await getTemplate(interaction);
				template = template
					? template
					: await getTemplateWithDB(interaction, client.settings);
				if (!template) {
					if (!interaction.channel || interaction.channel.isDMBased()) return;
					await (interaction.channel as Djs.TextChannel).send({
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
			console.error(e);
			if (!interaction.guild) return;
			const msgError = lError(e as Error, interaction, langToUse);
			if (msgError.length === 0) return;
			const cause = (e as Error).cause ? ((e as Error).cause as string) : undefined;
			const embed = embedError(msgError, ul, cause);
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
				if (logs instanceof Djs.TextChannel) {
					await logs.send(`\`\`\`\n${(e as Error).message}\n\`\`\``);
				}
			}
		}
	});
};

/**
 * Switch for modal submission
 * @param {Djs.ModalSubmitInteraction} interaction
 * @param ul {Translation}
 * @param interactionUser {User}
 * @param client
 */
async function modalSubmit(
	interaction: Djs.ModalSubmitInteraction,
	ul: Translation,
	interactionUser: Djs.User,
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
	else if (interaction.customId === "rename")
		await validateRename(interaction, ul, client);
	else if (interaction.customId === "move") await validateMove(interaction, ul, client);
}

/**
 * Switch for button interaction
 * @param interaction {Djs.ButtonInteraction}
 * @param ul {Translation}
 * @param interactionUser {User}
 * @param template {StatisticalTemplate}
 * @param db
 */
async function buttonSubmit(
	interaction: Djs.ButtonInteraction,
	ul: Translation,
	interactionUser: Djs.User,
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
	} else if (interaction.customId.includes("copyResult")) {
		const isMobile = interaction.customId.includes("mobile");
		//remove button from the message
		const message = await interaction.message.fetch();
		if (isMobile) await mobileLink(interaction, ul);
		else await desktopLink(interaction, ul);
		message.edit({ components: [] });
	}
}

async function selectSubmit(
	interaction: Djs.StringSelectMenuInteraction,
	ul: Translation,
	interactionUser: Djs.User,
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
 * Also prevent to cancel by user not authorized
 * @param interaction {Djs.ButtonInteraction}
 * @param ul {Translation}
 * @param interactionUser {User}
 */
async function cancel(
	interaction: Djs.ButtonInteraction,
	ul: Translation,
	interactionUser: Djs.User
) {
	const embed = ensureEmbed(interaction.message);
	const user =
		embed.fields
			.find((field) => field.name === ul("common.user"))
			?.value.replace("<@", "")
			.replace(">", "") === interactionUser.id;
	const isModerator = interaction.guild?.members.cache
		.get(interactionUser.id)
		?.permissions.has(Djs.PermissionsBitField.Flags.ManageRoles);
	if (user || isModerator) await interaction.message.edit({ components: [] });
	else await reply(interaction, { content: ul("modals.noPermission"), ephemeral: true });
}
