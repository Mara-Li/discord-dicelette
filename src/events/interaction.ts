import { AutocompleteInteraction, BaseInteraction, Client } from "discord.js";

import { commandsList } from "../commands";
import { autCompleteCmd } from "../Statistiques/roll";
import { createEmbedFirstPage, embedStatistiques } from "../utils/create_embed";
import { getTemplate, getTemplateWithDB } from "../utils/db";
import { showFistPageModal, showStatistiqueModal } from "../utils/modals";
import { parseEmbed } from "../utils/parse";

export default (client: Client): void => {
	client.on("interactionCreate", async (interaction: BaseInteraction) => {
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
				await interaction.reply({ content: "No template or configured channel"});
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
				await interaction.reply({ content: "No template or configured channel"});
				return;
			}
			const embed = parseEmbed(interaction);
			if (!embed) return;
			const allTemplateStat = Object.keys(template.statistic);
			const statsAlreadySet = Object.keys(embed).filter(stat => allTemplateStat.includes(stat));
			if (statsAlreadySet.length === allTemplateStat.length) {
				await interaction.reply({ content: "All stats are already set", ephemeral: true });
				return;
			}
			const page = isNaN(parseInt(interaction.customId.replace("page", ""))) ? 2 : parseInt(interaction.customId.replace("page", ""))+1;
			await showStatistiqueModal(interaction, template, statsAlreadySet, page);
		} else if (interaction.isModalSubmit() && interaction.customId.includes("page")) {
			const pageNumber = parseInt(interaction.customId.replace("page", ""));
			if (isNaN(pageNumber)) return;
			const template = await getTemplateWithDB(interaction);
			if (!template) {
				await interaction.reply({ content: "No template or configured channel"});
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