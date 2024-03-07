import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Locale, ModalSubmitInteraction, userMention } from "discord.js";
import { StatisticalTemplate, User } from "../interface";
import { ln } from "../localizations";

import { evalCombinaison } from "./verify_template";
import { repostInThread, title } from ".";
import { getStatistiqueFields } from "./parse";

export async function createEmbedFirstPage(interaction: ModalSubmitInteraction) {
	const ul = ln(interaction.locale as Locale);
	const channel = interaction.channel;
	if (!channel) return;
	const userFromField = interaction.fields.getTextInputValue("userID");
	const user = interaction.guild?.members.cache.find(member => member.id === userFromField || member.user.username === userFromField.toLowerCase());
	if (!user)
		throw new Error(ul.error.user);
	const charName = interaction.fields.getTextInputValue("charName");
	const embed = new EmbedBuilder()
		.setTitle("Registering User")
		.setThumbnail(user.user.displayAvatarURL())
		.setFooter({ text: "Page 1" })
		.addFields(
			{ name: "Character name", value: charName.length > 0 ? charName : "Not set", inline: true},
			{ name: "User", value: userMention(user.id), inline: true},
			{name: "\u200B", value: "_ _", inline: true}
		);
	//add continue button
	const continueButton = new ButtonBuilder()
		.setCustomId("continue")
		.setLabel("Continue")
		.setStyle(ButtonStyle.Success);
	const cancelButton = new ButtonBuilder()
		.setCustomId("cancel")
		.setLabel("Cancel")
		.setStyle(ButtonStyle.Danger);
	await interaction.reply({ embeds: [embed], components: [new ActionRowBuilder<ButtonBuilder>().addComponents([continueButton, cancelButton])] });
}

export async function embedStatistiques(interaction: ModalSubmitInteraction, template: StatisticalTemplate, page=2) {
	if (!interaction.message) return;
	const oldEmbeds = interaction.message?.embeds[0];
	if (!oldEmbeds) return;
	try {
		const {combinaisonFields, stats} = getStatistiqueFields(interaction, template);
		//combine all embeds as one
		

		//add stats to the old embed
		const embed = new EmbedBuilder()
			.setTitle("Registering User")
			.setThumbnail(oldEmbeds.thumbnail?.url || "")
			.setFooter({ text: `Page ${page}` });
		//add old fields
		if (!oldEmbeds.fields) return;
		for (const field of oldEmbeds.fields) {
			embed.addFields(field);
		}	
		for (const [stat, value] of Object.entries(stats)) {
			embed.addFields({
				name: title(stat),
				value: value.toString(),
				inline: true,
			});
		}
		
		const allTemplateStat = Object.keys(template.statistic).filter(stat => !Object.keys(combinaisonFields).includes(stat));
		const embedObject = embed.toJSON();
		const fields = embedObject.fields;
		if (!fields) return;
		const parsedFields: {[name: string]: string} = {};
		for (const field of fields) {
			parsedFields[field.name.toLowerCase()] = field.value.toLowerCase();
		}
		const embedStats = Object.keys(parsedFields).filter(stat => allTemplateStat.includes(stat));
		let combinaison:{[name: string]: number} = {};
		if (embedStats.length === allTemplateStat.length) {
			try {
				combinaison = evalCombinaison(combinaisonFields, stats);
				//add combinaison to the embed
				for (const stat of Object.keys(combinaison)) {
					embed.addFields({
						name: title(stat),
						value: combinaison[stat].toString(),
						inline: true,
					});
				}
			} catch (error) {
				await interaction.reply({ content: (error as Error).message, ephemeral: true });
				return;
			}

			let userID = oldEmbeds.fields.find(field => field.name === "User")?.value;
			let charName: string |undefined = oldEmbeds.fields.find(field => field.name === "Character name")?.value;
			if (charName && charName === "Not set")
				charName = undefined;
			if (!userID) {
				await interaction.reply({ content: "Invalid user", ephemeral: true });
				return;
			}
			userID = userID.replace("<@", "").replace(">", "");
			const userStatistique: User = {
				userName: charName,
				stats: {...stats, ...combinaison},
				template: {
					diceType: template.diceType,
					comparator: template.comparator,
				},	
			};
			await interaction.message.delete();
			await repostInThread(embed, interaction, userStatistique, userID);
			await interaction.reply({ content: "Stats finished", ephemeral: true });
			return;
		}
		const continueButton = new ButtonBuilder()
			.setCustomId("continue")
			.setLabel("Continue")
			.setStyle(ButtonStyle.Success);
		const cancelButton = new ButtonBuilder()
			.setCustomId("cancel")
			.setLabel("Cancel")
			.setStyle(ButtonStyle.Danger);
		await interaction.message.edit({ embeds: [embed], components: [new ActionRowBuilder<ButtonBuilder>().addComponents([continueButton, cancelButton])] });
		await interaction.reply({ content: "Stats added", ephemeral: true });
	} catch (error) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		await interaction.reply({ content: (error as any).message, ephemeral: true });
	}
}
