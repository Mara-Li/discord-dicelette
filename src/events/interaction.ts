import { StatisticalTemplate } from "@dicelette/core";
import { AutocompleteInteraction, BaseInteraction, ButtonInteraction, ModalSubmitInteraction, PermissionsBitField, TextChannel, User } from "discord.js";
import { TFunction } from "i18next";

import { EClient } from "..";
import { autCompleteCmd,commandsList } from "../commands";
import { button_add_dice,submit_damageDice } from "../database/dice/add";
import { start_edit_dice,validate_editDice } from "../database/dice/edit";
import { continuePage,open_register_user,pageNumber, submit_firstPage } from "../database/register/start";
import { button_validate_user } from "../database/register/validate";
import { editStats,start_edit_stats } from "../database/stats/edit";
import { lError,ln } from "../localizations";
import { reply } from "../utils";
import { getTemplate, getTemplateWithDB } from "../utils/db";
import { ensureEmbed } from "../utils/parse";


export default (client: EClient): void => {
	client.on("interactionCreate", async (interaction: BaseInteraction) => {
		const ul = ln(interaction.locale);
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
				await command.autocomplete(interac);
			} else if (interaction.isButton()) {
				let template = await getTemplate(interaction);
				template = template ? template : await getTemplateWithDB(interaction, client.settings);
				if (!template) {
					await interaction.channel?.send({ content: ul("error.noTemplate")});
					return;
				}
				await buttonSubmit(interaction, ul, interactionUser, template);
			} else if (interaction.isModalSubmit()) {
				await modalSubmit(interaction, ul, interactionUser);
			}
		} catch (error) {
			console.error(error);
			if (!interaction.guild) return;
			const msgError = lError(error as Error, interaction);
			if (interaction.isButton() || interaction.isModalSubmit() || interaction.isCommand())
				await reply(interaction, msgError);
			const db = client.settings.get(interaction.guild.id);
			if (!db) return;
			if (client.settings.has(interaction.guild.id, "logs")) {
				const logs = await interaction.guild.channels.fetch(client.settings.get(interaction.guild.id, "logs") as string);
				if (logs instanceof TextChannel) {
					logs.send(`\`\`\`\n${(error as Error).message}\n\`\`\``);
				}
			}
		}
	});
};

/**
 * Switch for modal submission
 * @param interaction {ModalSubmitInteraction}
 * @param ul {TFunction<"translation", undefined>}
 * @param interactionUser {User}
 */
async function modalSubmit(interaction: ModalSubmitInteraction, ul: TFunction<"translation", undefined>, interactionUser: User) {
	if (interaction.customId.includes("damageDice")) {
		await submit_damageDice(interaction, ul, interactionUser);
	} else if (interaction.customId.includes("page")) {
		await pageNumber(interaction, ul);
	} else if (interaction.customId === "editStats") {
		await editStats(interaction, ul);
	} else if (interaction.customId=="firstPage") {
		await submit_firstPage(interaction);
	} else if (interaction.customId === "editDice") {
		await validate_editDice(interaction, ul);
	} 
}

/**
 * Switch for button interaction
 * @param interaction {ButtonInteraction}
 * @param ul {TFunction<"translation", undefined>}
 * @param interactionUser {User}
 * @param template {StatisticalTemplate}
 */
async function buttonSubmit(interaction: ButtonInteraction, ul: TFunction<"translation", undefined>, interactionUser: User, template: StatisticalTemplate) {
	if (interaction.customId === "register")
		await open_register_user(interaction, template, interactionUser, ul);
	else if (interaction.customId=="continue") {
		await continuePage(interaction, template, ul, interactionUser);
	} else if (interaction.customId.includes("add_dice")) {
		await button_add_dice(interaction, ul, interactionUser);
	} else if (interaction.customId === "edit_stats") {
		await start_edit_stats(interaction, ul, interactionUser);
	} else if (interaction.customId === "validate") {
		await button_validate_user(interaction, interactionUser, template, ul);
	} else if (interaction.customId === "cancel") await cancel(interaction, ul, interactionUser);
	else if (interaction.customId === "edit_dice") await start_edit_dice(interaction, ul, interactionUser);
}

/**
 * Interaction when the cancel button is pressed
 * Also prevent to cancel by user not autorized
 * @param interaction {ButtonInteraction}
 * @param ul {TFunction<"translation", undefined>}
 * @param interactionUser {User}
 */
async function cancel(interaction: ButtonInteraction, ul: TFunction<"translation", undefined>, interactionUser: User) {
	const embed = ensureEmbed(interaction.message);
	const user = embed.fields.find(field => field.name === ul("common.user"))?.value.replace("<@", "").replace(">", "") === interactionUser.id;
	const isModerator = interaction.guild?.members.cache.get(interactionUser.id)?.permissions.has(PermissionsBitField.Flags.ManageRoles);
	if (user || isModerator)
		await interaction.message.edit({ components: [] });
	else await reply(interaction,{ content: ul("modals.noPermission"), ephemeral: true });
}

