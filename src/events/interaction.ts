import { AutocompleteInteraction, BaseInteraction, ButtonInteraction, Client, ModalSubmitInteraction, TextChannel, User } from "discord.js";
import { TFunction } from "i18next";

import { autCompleteCmd,commandsList } from "../commands";
import { StatisticalTemplate } from "../interface";
import { lError, ln } from "../localizations";
import { getTemplate, getTemplateWithDB, readDB } from "../utils/db";
import { editDice, editStats, editTemplate } from "../utils/embeds/edit";
import { validateUser } from "../utils/embeds/register_embeds";
import {showEditDice, showEditTemplate } from "../utils/modals/edit_modals";
import { showFirstPageModal } from "../utils/modals/register_modals";
import { add_dice,continuePage, edit_stats } from "../utils/submit/button";
import { damageDice, firstPage, pageNumber } from "../utils/submit/modal";

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
		await damageDice(interaction, ul, interactionUser);
	} else if (interaction.customId.includes("page")) {
		await pageNumber(interaction, ul);
	} else if (interaction.customId === "editStats") {
		await editStats(interaction, ul, );
	} else if (interaction.customId=="firstPage") {
		await firstPage(interaction);
	} else if (interaction.customId === "editTemplate") {
		await editTemplate(interaction, ul);
	} else if (interaction.customId === "editDice") {
		await editDice(interaction, ul);
	}
}

async function buttonSubmit(interaction: ButtonInteraction, ul: TFunction<"translation", undefined>, interactionUser: User, template: StatisticalTemplate) {
	if (interaction.customId === "register")
		await showFirstPageModal(interaction, template);
	else if (interaction.customId=="continue") {
		await continuePage(interaction, template, ul);
	} else if (interaction.customId.includes("add_dice")) {
		await add_dice(interaction, ul, interactionUser);
	} else if (interaction.customId === "edit_stats") {
		await edit_stats(interaction, ul, interactionUser);
	} else if (interaction.customId === "validate") {
		await validateUser(interaction, template);
	} else if (interaction.customId === "cancel") await interaction.message.edit({ components: [] });
	else if (interaction.customId === "edit_template" || interaction.customId === "add_template") await showEditTemplate(interaction, ul);
	else if (interaction.customId === "edit_dice") await showEditDice(interaction, ul);
}