import { AutocompleteInteraction, BaseInteraction, ButtonInteraction, Client, ModalSubmitInteraction, PermissionsBitField, TextChannel, User } from "discord.js";
import { TFunction } from "i18next";

import { autCompleteCmd,commandsList } from "../commands";
import { button_add_dice,submit_damageDice } from "../database/dice/add";
import { validate_editDice, start_edit_dice } from "../database/dice/edit";
import { continuePage,submit_firstPage, pageNumber, open_register_user } from "../database/register/start";
import { button_validate_user } from "../database/register/validate";
import { edit_stats,editStats } from "../database/stats/edit";
import { StatisticalTemplate } from "../interface";
import { lError,ln } from "../localizations";
import { getTemplate, getTemplateWithDB,readDB } from "../utils/db";
import { ensureEmbed } from "../utils/verify_template";


export default (client: Client): void => {
	client.on("interactionCreate", async (interaction: BaseInteraction) => {
		const ul = ln(interaction.locale);
		const interactionUser = interaction.user;
		if (interaction.isCommand()) {
			const command = commandsList.find(
				(cmd) => cmd.data.name === interaction.commandName
			);
			if (!command) return;
			try {
				await command.execute(interaction);
			} catch (error) {
				console.log(error);
				await interaction.reply({ content: ul("error.generic", {error: error as Error}), ephemeral: true });
			}
		} else if (interaction.isAutocomplete()) {
			const interac = interaction as AutocompleteInteraction;
			const command = autCompleteCmd.find(
				(cmd) => cmd.data.name === interac.commandName
			);
			if (!command) return;
			try {
				await command.autocomplete(interac);
			} catch (error) {
				console.error(error);
				if (!interaction.guild) return;
				const db = readDB(interaction.guild.id);
				if (!db) return;
				if (db.db.logs) {
					const logs = await interaction.guild.channels.fetch(db.db.logs);
					if (logs instanceof TextChannel) {
						logs.send(`\`\`\`\n${(error as Error).message}\n\`\`\``);
					}
				}
			}	
		} else if (interaction.isButton()) {
			let template = await getTemplate(interaction);
			template = template ? template : await getTemplateWithDB(interaction);
			if (!template) {
				await interaction.reply({ content: ul("error.noTemplate")});
				return;
			}
			try {
				await buttonSubmit(interaction, ul, interactionUser, template);
			} catch (error) {
				console.error(error);
				await interaction.reply({ content: ul("error.generic", {error: error as Error}), ephemeral: true });
			}
		} else if (interaction.isModalSubmit()) {
			try {
				await modalSubmit(interaction, ul, interactionUser);
			} catch (error) {
				console.error(error);
				const translationError = lError(error as Error, interaction);
				await interaction.reply({ content: translationError, ephemeral: true });
			}
		}
	});
};

async function modalSubmit(interaction: ModalSubmitInteraction, ul: TFunction<"translation", undefined>, interactionUser: User) {
	if (interaction.customId.includes("damageDice")) {
		await submit_damageDice(interaction, ul, interactionUser);
	} else if (interaction.customId.includes("page")) {
		await pageNumber(interaction, ul);
	} else if (interaction.customId === "editStats") {
		await editStats(interaction, ul, );
	} else if (interaction.customId=="firstPage") {
		await submit_firstPage(interaction);
	} else if (interaction.customId === "editDice") {
		await validate_editDice(interaction, ul);
	} 
}

async function buttonSubmit(interaction: ButtonInteraction, ul: TFunction<"translation", undefined>, interactionUser: User, template: StatisticalTemplate) {
	if (interaction.customId === "register")
		await open_register_user(interaction, template, interactionUser, ul);
	else if (interaction.customId=="continue") {
		await continuePage(interaction, template, ul, interactionUser);
	} else if (interaction.customId.includes("add_dice")) {
		await button_add_dice(interaction, ul, interactionUser);
	} else if (interaction.customId === "edit_stats") {
		await edit_stats(interaction, ul, interactionUser);
	} else if (interaction.customId === "validate") {
		await button_validate_user(interaction, interactionUser, template, ul);
	} else if (interaction.customId === "cancel") await cancel(interaction, ul, interactionUser);
	else if (interaction.customId === "edit_dice") await start_edit_dice(interaction, ul, interactionUser);
}

async function cancel(interaction: ButtonInteraction, ul: TFunction<"translation", undefined>, interactionUser: User) {
	const embed = ensureEmbed(interaction.message);
	const user = embed.fields.find(field => field.name === ul("common.user"))?.value.replace("<@", "").replace(">", "") === interactionUser.id;
	const isModerator = interaction.guild?.members.cache.get(interactionUser.id)?.permissions.has(PermissionsBitField.Flags.ManageRoles);
	if (user || isModerator)
		await interaction.message.edit({ components: [] });
	else await interaction.reply({ content: ul("modals.noPermission"), ephemeral: true });
}

