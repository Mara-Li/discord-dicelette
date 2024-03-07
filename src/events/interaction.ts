import { AutocompleteInteraction, BaseInteraction, Client } from "discord.js";

import { commandsList } from "../commands/base";
import { autCompleteCmd } from "../commands/dbroll";
import { createEmbedFirstPage, embedStatistiques } from "../utils/create_embed";
import { getTemplate, getTemplateWithDB } from "../utils/db";
import { showFistPageModal, showStatistiqueModal } from "../utils/modals";
import { parseEmbed } from "../utils/parse";
import { ln } from "../localizations";
import { Locale } from "moment";

export default (client: Client): void => {
	client.on("interactionCreate", async (interaction: BaseInteraction) => {
		const ul = ln(interaction.locale)
		if (interaction.isCommand()) {
			const command = commandsList.find(
				(cmd) => cmd.data.name === interaction.commandName
			);
			if (!command) return;
			try {
				await command.execute(interaction);
			} catch (error) {
				console.log(error);
			}
		}
		else if (interaction.isButton() && interaction.customId === "register") {
			const template = await getTemplate(interaction);
			if (!template) {
				await interaction.reply({ content: ul.error.noTemplate});
				return;
			}
			try {
				await showFistPageModal(interaction, template);
			} catch (error) {
				console.log(error);
			}
		} else if (interaction.isModalSubmit() && interaction.customId=="firstPage") {
			if (!interaction.guild || !interaction.channel || interaction.channel.isDMBased()) return;
			await createEmbedFirstPage(interaction);
		} else if (interaction.isButton() && interaction.customId=="continue") {
			const template = await getTemplateWithDB(interaction);
			if (!template) {
				await interaction.reply({ content: ul.error.noTemplate});
				return;
			}
			const embed = parseEmbed(interaction);
			if (!embed) return;
			const allTemplateStat = Object.keys(template.statistic);
			const statsAlreadySet = Object.keys(embed).filter(stat => allTemplateStat.includes(stat));
			if (statsAlreadySet.length === allTemplateStat.length) {
				await interaction.reply({ content: ul.modals.alreadySet, ephemeral: true });
				return;
			}
			const page = isNaN(parseInt(interaction.customId.replace("page", ""))) ? 2 : parseInt(interaction.customId.replace("page", ""))+1;
			await showStatistiqueModal(interaction, template, statsAlreadySet, page);
		} else if (interaction.isModalSubmit() && interaction.customId.includes("page")) {
			const pageNumber = parseInt(interaction.customId.replace("page", ""));
			if (isNaN(pageNumber)) return;
			const template = await getTemplateWithDB(interaction);
			if (!template) {
				await interaction.reply({ content: ul.error.noTemplate});
				return;
			}
			await embedStatistiques(interaction, template, pageNumber);
		} else if (interaction.isButton() && interaction.customId.includes("cancel")) {
			await interaction.message.edit({ components: [] });
		} else if (interaction.isAutocomplete()) {
			const interac = interaction as AutocompleteInteraction;
			const command = autCompleteCmd.find(
				(cmd) => cmd.data.name === interac.commandName
			);
			if (!command) return;
			try {
				await command.autocomplete(interac);
			} catch (error) {
				console.log(error);
			}
		}
	});
};