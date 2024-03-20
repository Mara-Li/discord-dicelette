import { AutocompleteInteraction, BaseInteraction, Client, PermissionsBitField, TextChannel } from "discord.js";
import removeAccents from "remove-accents";

import { commandsList } from "../commands/base";
import { autCompleteCmd } from "../commands/dbroll";
import { lError, ln } from "../localizations";
import { createEmbedFirstPage, embedStatistiques, registerDamageDice, validateUser } from "../utils/create_embed";
import { getTemplate, getTemplateWithDB, readDB } from "../utils/db";
import { showDamageDiceModals, showFirstPageModal, showStatistiqueModal } from "../utils/modals";
import { parseEmbed } from "../utils/parse";
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
		} else if (interaction.isButton() && interaction.customId === "register") {
			const template = await getTemplate(interaction);
			if (!template) {
				await interaction.reply({ content: ul("error.noTemplate")});
				return;
			}
			try {
				await showFirstPageModal(interaction, template);
			} catch (error) {
				console.error(error);
				await interaction.reply({ content: ul("error.generic", {error: error as Error}), ephemeral: true });
			}
		} else if (interaction.isModalSubmit() && interaction.customId=="firstPage") {
			if (!interaction.guild || !interaction.channel || interaction.channel.isDMBased()) return;
			const template = await getTemplateWithDB(interaction);
			if (!template) return;
			await createEmbedFirstPage(interaction, template);
		} else if (interaction.isButton() && interaction.customId=="continue") {
			try {
				const template = await getTemplateWithDB(interaction);
				if (!template) {
					await interaction.reply({ content: ul("error.noTemplate")});
					return;
				}
				const embed = parseEmbed(interaction);
				if (!embed) return;
				if (!template.statistics) return;
				const allTemplateStat = Object.keys(template.statistics);
				const statsAlreadySet = Object.keys(embed).filter(stat => allTemplateStat.includes(removeAccents(stat).replace("✏️", "").toLowerCase().trim())).map(stat => removeAccents(stat).replace("✏️", "").toLowerCase().trim());
				if (statsAlreadySet.length === allTemplateStat.length) {
					await interaction.reply({ content: ul("modals.alreadySet"), ephemeral: true });
					return;
				}
				const page = isNaN(parseInt(interaction.customId.replace("page", ""), 10)) ? 2 : parseInt(interaction.customId.replace("page", ""), 10)+1;
				await showStatistiqueModal(interaction, template, statsAlreadySet, page);
			} catch (error) {
				console.error(error);
				const translationError = lError(error as Error, interaction);
				await interaction.reply({ content: translationError, ephemeral: true });
			}
		} else if (interaction.isButton() && interaction.customId.includes("add_dice")) {
			const embed = ensureEmbed(interaction.message);
			const user = embed.fields.find(field => field.name === ul("common.user"))?.value.replace("<@", "").replace(">", "") === interactionUser.id;
			const isModerator = interaction.guild?.members.cache.get(interactionUser.id)?.permissions.has(PermissionsBitField.Flags.ManageRoles);
			if (user || isModerator)
				showDamageDiceModals(interaction, interaction.customId.includes("first"));
		} else if (interaction.isButton() && interaction.customId === "validate") {
			try {
				const template = await getTemplateWithDB(interaction);
				if (!template) {
					await interaction.reply({ content: ul("error.noTemplate")});
					return;
				}
				await validateUser(interaction, template);
			} catch (error) {
				console.error(error);
				const translationError = lError(error as Error, interaction);
				await interaction.reply({ content: translationError, ephemeral: true });
			}
		} else if (interaction.isModalSubmit() && interaction.customId.includes("damageDice")) {
			const template = await getTemplateWithDB(interaction);
			if (!template) {
				await interaction.reply({ content: ul("error.noTemplate")});
				return;
			}
			const embed = ensureEmbed(interaction.message ?? undefined);
			const user = embed.fields.find(field => field.name === ul("common.user"))?.value.replace("<@", "").replace(">", "") === interactionUser.id;
			const isModerator = interaction.guild?.members.cache.get(interactionUser.id)?.permissions.has(PermissionsBitField.Flags.ManageRoles);
			try {
				if (user || isModerator)
					await registerDamageDice(interaction, interaction.customId.includes("first"));
			} catch (error) {
				console.error(error);
				const translationError = lError(error as Error, interaction);
				await interaction.reply({ content: translationError, ephemeral: true });
			}
		} else if (interaction.isModalSubmit() && interaction.customId.includes("page")) {
			try {
				const pageNumber = parseInt(interaction.customId.replace("page", ""), 10);
				if (isNaN(pageNumber)) return;
				const template = await getTemplateWithDB(interaction);
				if (!template) {
					await interaction.reply({ content: ul("error.noTemplate")});
					return;
				}
				await embedStatistiques(interaction, template, pageNumber);
			} catch (error) {
				console.error(error);
				const translationError = lError(error as Error, interaction);
				await interaction.reply({ content: translationError, ephemeral: true });
			}
		} else if (interaction.isButton() && interaction.customId === "cancel") {
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
		}
	});
};