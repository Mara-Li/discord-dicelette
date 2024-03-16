import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, EmbedBuilder, Locale, ModalSubmitInteraction, userMention } from "discord.js";

import { StatisticalTemplate, User } from "../interface";
import { lError, ln } from "../localizations";
import { repostInThread, title } from ".";
import { getStatistiqueFields } from "./parse";
import { evalCombinaison } from "./verify_template";

export async function createEmbedFirstPage(interaction: ModalSubmitInteraction) {
	const ul = ln(interaction.locale as Locale);
	const channel = interaction.channel;
	if (!channel) return;
	const userFromField = interaction.fields.getTextInputValue("userID");
	const user = interaction.guild?.members.cache.find(member => member.id === userFromField || member.user.username === userFromField.toLowerCase());
	if (!user) {	
		interaction.reply({ content: ul.error.user, ephemeral: true });
		return;
	}
	const charName = interaction.fields.getTextInputValue("charName");
	const embed = new EmbedBuilder()
		.setTitle(ul.modals.registering)
		.setThumbnail(user.user.displayAvatarURL())
		.setFooter({ text: ul.common.page(1) })
		.addFields(
			{ name: ul.common.charName, value: charName.length > 0 ? charName : ul.common.noSet, inline: true},
			{ name: ul.common.user, value: userMention(user.id), inline: true},
			{name: "\u200B", value: "_ _", inline: true}
		);
	//add continue button
	const continueButton = new ButtonBuilder()
		.setCustomId("continue")
		.setLabel(ul.modals.continue)
		.setStyle(ButtonStyle.Success);
	const cancelButton = new ButtonBuilder()
		.setCustomId("cancel")
		.setLabel(ul.modals.cancel)
		.setStyle(ButtonStyle.Danger);
	await interaction.reply({ embeds: [embed], components: [new ActionRowBuilder<ButtonBuilder>().addComponents([continueButton, cancelButton])] });
}

export async function embedStatistiques(interaction: ModalSubmitInteraction, template: StatisticalTemplate, page=2) {
	if (!interaction.message) return;
	const ul = ln(interaction.locale as Locale);
	const oldEmbeds = interaction.message?.embeds[0];
	if (!oldEmbeds) return;
	try {
		const {combinaisonFields, stats} = getStatistiqueFields(interaction, template);
		//combine all embeds as one
		const embed = new EmbedBuilder()
			.setTitle(ul.modals.embedTitle)
			.setThumbnail(oldEmbeds.thumbnail?.url || "")
			.setFooter({ text: ul.common.page(page) });
		//add old fields
		if (!oldEmbeds.fields) return;
		for (const field of oldEmbeds.fields) {
			embed.addFields(field);
		}	
		for (const [stat, value] of Object.entries(stats)) {
			embed.addFields({
				name: title(stat) ?? "",
				value: value.toString(),
				inline: true,
			});
		}
		
		const allTemplateStat = Object.keys(template.statistics).filter(stat => !Object.keys(combinaisonFields).includes(stat));
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
						name: title(stat) ?? "",
						value: combinaison[stat].toString(),
						inline: true,
					});
				}
			} catch (error) {
				const errorMsg = lError(error as Error, interaction);
				await interaction.reply({ content: errorMsg, ephemeral: true });
				return;
			}
			const registerDmgButton = new ButtonBuilder()
				.setCustomId("registerDmg")
				.setLabel("Register damage dice")
				.setStyle(ButtonStyle.Primary);
			const validateButton = new ButtonBuilder()
				.setCustomId("validate")
				.setLabel("Validate")
				.setStyle(ButtonStyle.Success);
			const cancelButton = new ButtonBuilder()
				.setCustomId("cancel")
				.setLabel(ul.modals.cancel)
				.setStyle(ButtonStyle.Danger);
			await interaction.message.edit({ embeds: [embed], components: [new ActionRowBuilder<ButtonBuilder>().addComponents([registerDmgButton, validateButton, cancelButton])] });
			await interaction.reply({ content: ul.modals.added, ephemeral: true });			
		}
		const continueButton = new ButtonBuilder()
			.setCustomId("continue")
			.setLabel(ul.modals.continue)
			.setStyle(ButtonStyle.Success);
		const cancelButton = new ButtonBuilder()
			.setCustomId("cancel")
			.setLabel(ul.modals.cancel)
			.setStyle(ButtonStyle.Danger);
		await interaction.message.edit({ embeds: [embed], components: [new ActionRowBuilder<ButtonBuilder>().addComponents([continueButton, cancelButton])] });
		await interaction.reply({ content: ul.modals.added, ephemeral: true });
	} catch (error) {
		const errorMsg = lError(error as Error, interaction);
		await interaction.reply({ content: errorMsg, ephemeral: true });
	}
}

export async function validateUser(interaction: ButtonInteraction, template: StatisticalTemplate) {
	const ul = ln(interaction.locale as Locale);
	const oldEmbeds = interaction.message.embeds[0];
	if (!oldEmbeds) return;
	let userID = oldEmbeds.fields.find(field => field.name === ul.common.user)?.value;
	let charName: string | undefined = oldEmbeds.fields.find(field => field.name === ul.common.charName)?.value;
	if (charName && charName === ul.common.noSet)
		charName = undefined;
	if (!userID) {
		await interaction.reply({ content: ul.error.user, ephemeral: true });
		return;
	}
	userID = userID.replace("<@", "").replace(">", "");
	const fields = oldEmbeds.fields;
	if (!fields) return;
	const parsedFields: {[name: string]: string} = {};
	for (const field of fields) {
		parsedFields[field.name.toLowerCase()] = field.value.toLowerCase();
	}
	const embed = new EmbedBuilder()
		.setTitle(ul.modals.embedTitle)
		.setThumbnail(oldEmbeds.thumbnail?.url || "");
	//add old fields
	for (const field of oldEmbeds.fields) {
		embed.addFields(field);
	}
	const templateStat = Object.keys(template.statistics);
	const stats: {[name: string]: number} = {};
	for (const stat of templateStat) {
		stats[stat] = parseInt(parsedFields[stat], 10);
	}
	const damageFields = oldEmbeds.fields.filter(field => field.name.startsWith("🔪"));
	let templateDamage: {[name: string]: string} | undefined = undefined;
	if (damageFields.length > 0) {
		templateDamage = {};
		for (const damage of damageFields) {
			templateDamage[damage.name] = damage.value;
		}
	}

	const userStatistique: User = {
		userName: charName,
		stats,
		template: {
			diceType: template.diceType,
			comparator: template.comparator,
		},	
		damage: templateDamage,
	};
	await interaction?.message?.delete();
	await repostInThread(embed, interaction, userStatistique, userID);
	await interaction.reply({ content: ul.modals.finished, ephemeral: true });
	return;
}

export async function registerDamageDice(interaction: ModalSubmitInteraction) {
	const ul = ln(interaction.locale as Locale);
	const name = interaction.fields.getTextInputValue("damageName");
	const value = interaction.fields.getTextInputValue("damageValue");
	const oldEmbeds = interaction.message?.embeds[0];
	if (!oldEmbeds) return;
	const embed = new EmbedBuilder()
		.setTitle(ul.modals.embedTitle)
		.setThumbnail(oldEmbeds.thumbnail?.url || "");
	//add old fields
	if (!oldEmbeds.fields) return;
	for (const field of oldEmbeds.fields) {
		embed.addFields(field);
	}
	//add damage fields
	embed.addFields({
		name: `🔪 ${name}`,
		value,
		inline: true,
	});
	const registerDmgButton = new ButtonBuilder()
		.setCustomId("registerDmg")
		.setLabel("Register damage dice")
		.setStyle(ButtonStyle.Primary);
	const validateButton = new ButtonBuilder()
		.setCustomId("validate")
		.setLabel("Validate")
		.setStyle(ButtonStyle.Success);
	const cancelButton = new ButtonBuilder()
		.setCustomId("cancel")
		.setLabel(ul.modals.cancel)
		.setStyle(ButtonStyle.Danger);
	const allButtons = new ActionRowBuilder<ButtonBuilder>().addComponents([registerDmgButton, validateButton, cancelButton]);
	await interaction?.message?.edit({ embeds: [embed], components: [allButtons] });
	await interaction.reply({ content: ul.modals.added, ephemeral: true });
	return;
}