/* eslint-disable @typescript-eslint/no-unused-vars */
import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, EmbedBuilder, Locale, ModalSubmitInteraction, userMention } from "discord.js";
import { TFunction } from "i18next";

import { StatisticalTemplate, User } from "../interface";
import { lError, ln } from "../localizations";
import { repostInThread, title } from ".";
import { getStatistiqueFields, getUserByEmbed, parseEmbedFields } from "./parse";
import { ensureOldEmbeds, evalCombinaison, evalStatsDice } from "./verify_template";

export async function createEmbedFirstPage(interaction: ModalSubmitInteraction, template: StatisticalTemplate) {
	const ul = ln(interaction.locale as Locale);
	const channel = interaction.channel;
	if (!channel) return;
	const userFromField = interaction.fields.getTextInputValue("userID");
	const user = interaction.guild?.members.cache.find(member => member.id === userFromField || member.user.username === userFromField.toLowerCase());
	if (!user) {	
		interaction.reply({ content: ul("error.user"), ephemeral: true });
		return;
	}
	const charName = interaction.fields.getTextInputValue("charName");
	const embed = new EmbedBuilder()
		.setTitle(ul("modals.registering"))
		.setThumbnail(user.user.displayAvatarURL())
		.setFooter({ text: ul("common.page", {nb: 1})})
		.addFields(
			{ name: ul("common.charName"), value: charName.length > 0 ? charName : ul("common.noSet"), inline: true},
			{ name: ul("common.user"), value: userMention(user.id), inline: true},
			{name: "\u200B", value: "_ _", inline: true}
		);
	//add continue button
	if (template.statistics) {
		await interaction.reply({ embeds: [embed], components: [continueCancelButtons(ul)] });
		return;
	}
	const allButtons = registerDmgButton(ul);
	await interaction.reply({ embeds: [embed], components: [allButtons] });	
}

export function editUserButtons(ul: TFunction<"translation", undefined>) {
	const editUser = new ButtonBuilder()
		.setCustomId("edit_stats")
		.setLabel(ul("modals.edit.stats"))
		.setStyle(ButtonStyle.Primary);
	const editDice = new ButtonBuilder()
		.setCustomId("edit_dice")
		.setLabel(ul("modals.edit.dice"))
		.setStyle(ButtonStyle.Primary);
	const addDice = new ButtonBuilder()
		.setCustomId("add_dice")
		.setLabel(ul("modals.add.dice"))
		.setStyle(ButtonStyle.Primary);
	const editTemplate = new ButtonBuilder()
		.setCustomId("edit_template")
		.setLabel(ul("modals.edit.template"))
		.setStyle(ButtonStyle.Primary);
	return new ActionRowBuilder<ButtonBuilder>().addComponents([editUser, editDice, addDice, editTemplate]);				
}

function continueCancelButtons(ul: TFunction<"translation", undefined>) {
	const continueButton = new ButtonBuilder()
		.setCustomId("continue")
		.setLabel(ul("modals.continue"))
		.setStyle(ButtonStyle.Success);
	const cancelButton = new ButtonBuilder()
		.setCustomId("cancel")
		.setLabel(ul("modals.cancel"))
		.setStyle(ButtonStyle.Danger);
	return new ActionRowBuilder<ButtonBuilder>().addComponents([continueButton, cancelButton]);
}

function registerDmgButton(ul: TFunction<"translation", undefined>) {
	const validateButton = new ButtonBuilder()
		.setCustomId("validate")
		.setLabel(ul("common.validate"))
		.setStyle(ButtonStyle.Success);
	const cancelButton = new ButtonBuilder()
		.setCustomId("cancel")
		.setLabel(ul("modals.cancel"))
		.setStyle(ButtonStyle.Danger);
	const registerDmgButton = new ButtonBuilder()
		.setCustomId("add_dice_first")
		.setLabel(ul("modals.register"))
		.setStyle(ButtonStyle.Primary);
	return new ActionRowBuilder<ButtonBuilder>().addComponents([registerDmgButton, validateButton, cancelButton]);
}

export async function embedStatistiques(interaction: ModalSubmitInteraction, template: StatisticalTemplate, page=2) {
	if (!interaction.message) return;
	const ul = ln(interaction.locale as Locale);
	const oldEmbeds = ensureOldEmbeds(interaction.message);
	try {
		const {combinaisonFields, stats} = getStatistiqueFields(interaction, template);
		//combine all embeds as one
		const embed = new EmbedBuilder()
			.setTitle(ul("modals.embedTitle"))
			.setThumbnail(oldEmbeds.thumbnail?.url || "")
			.setFooter({ text: ul("common.page", {nb: page}) });
		//add old fields
		for (const field of oldEmbeds.fields) {
			embed.addFields(field);
		}
		for (const [stat, value] of Object.entries(stats)) {
			embed.addFields({
				name: title(`✏️ ${title(stat)}`) ?? "",
				value: value.toString(),
				inline: true,
			});
		}
		
		
		const allTemplateStat = template.statistics ? Object.keys(template.statistics).filter(stat => !Object.keys(combinaisonFields).includes(stat)) : [];
		const embedObject = embed.toJSON();
		const fields = embedObject.fields;
		if (!fields) return;
		const parsedFields: {[name: string]: string} = {};
		for (const field of fields) {
			parsedFields[field.name.toLowerCase().replace("✏️", "").trim()] = field.value.toLowerCase();
		}
		const embedStats = template.statistics ? Object.keys(parsedFields).filter(stat => allTemplateStat.includes(stat.trim())) : [];
		let combinaison:{[name: string]: number} = {};
		if (embedStats.length === allTemplateStat.length) {
			try {
				combinaison = evalCombinaison(combinaisonFields, stats);
				//add combinaison to the embed
				for (const stat of Object.keys(combinaison)) {
					embed.addFields({
						name: title(`✏️ ${title(stat)}`) ?? "",
						value: ` ${combinaisonFields[stat]} = ${combinaison[stat].toString()}`,
						inline: true,
					});
				}
			} catch (error) {
				const errorMsg = lError(error as Error, interaction);
				await interaction.reply({ content: errorMsg, ephemeral: true });
				return;
			}
			await interaction.message.edit({ embeds: [embed], components: [registerDmgButton(ul)] });
			await interaction.reply({ content: ul("modals.added"), ephemeral: true });
			return;	
		}
		await interaction.message.edit({ embeds: [embed], components: [continueCancelButtons(ul)] });
		await interaction.reply({ content: ul("modals.added"), ephemeral: true });
	} catch (error) {
		const errorMsg = lError(error as Error, interaction);
		await interaction.reply({ content: errorMsg, ephemeral: true });
	}
}

export async function validateUser(interaction: ButtonInteraction, template: StatisticalTemplate) {
	const ul = ln(interaction.locale as Locale);
	const oldEmbeds = ensureOldEmbeds(interaction.message);
	let userID = oldEmbeds.fields.find(field => field.name === ul("common.user"))?.value;
	let charName: string | undefined = oldEmbeds.fields.find(field => field.name === ul("common.charName"))?.value;
	if (charName && charName === ul("common.noSet"))
		charName = undefined;
	if (!userID) {
		await interaction.reply({ content: ul("error.user"), ephemeral: true });
		return;
	}
	userID = userID.replace("<@", "").replace(">", "");
	const parsedFields = parseEmbedFields(oldEmbeds);
	const embed = new EmbedBuilder()
		.setTitle(ul("modals.embedTitle"))
		.setThumbnail(oldEmbeds.thumbnail?.url || "");
	//add old fields
	for (const field of oldEmbeds.fields) {
		embed.addFields(field);
	}
	const templateStat = template.statistics ? Object.keys(template.statistics) : [];
	const stats: {[name: string]: number} = {};
	for (const stat of templateStat) {
		stats[stat] = parseInt(parsedFields[stat.replace("✏️", "")], 10);
	}
	const damageFields = oldEmbeds.fields.filter(field => field.name.startsWith("🔪"));
	let templateDamage: {[name: string]: string} | undefined = undefined;
	if (damageFields.length > 0) {
		templateDamage = {};
		for (const damage of damageFields) {
			templateDamage[damage.name.replace("🔪", "").trim()] = damage.value;
		}
		if (template.damage)
			for (const [name, dice] of Object.entries(template.damage)) {
				templateDamage[name] = dice;
				embed.addFields({
					name: `🔪 ${name}`,
					value: dice,
					inline: true,
				});
			}
	}
	//count the number of damage fields
	const nbDmg = Object.keys(templateDamage || {}).length;
	if (nbDmg > 25) throw new Error("[error.tooManyDmg]");
	const userStatistique: User = {
		userName: charName,
		stats,
		template: {
			diceType: template.diceType,
			critical: template.critical,
		},	
		damage: templateDamage,
	};
	embed.addFields({
		name: "_ _",
		value: "_ _",
		inline: true
	},
	{
		name: `**${ul("register.embed.title")}**`,
		value: "_ _",
		inline: true
	},
	{
		name: "_ _",
		value: "_ _",
		inline: true
	});
	if (template.diceType)
		embed.addFields({
			name: ul("common.dice"),
			value: template.diceType,
			inline: true,
		});
	if (template.critical?.success){
		embed.addFields({
			name: ul("roll.critical.success"),
			value: template.critical.success.toString(),
			inline: true,
		});	
	}
	if (template.critical?.failure){
		embed.addFields({
			name: ul("roll.critical.failure"),
			value: template.critical.failure.toString(),
			inline: true,
		});	
	}
	await interaction?.message?.delete();
	await repostInThread(embed, interaction, userStatistique, userID, ul);
	await interaction.reply({ content: ul("modals.finished"), ephemeral: true });
	return;
}

export async function registerDamageDice(interaction: ModalSubmitInteraction, first?: boolean) {
	const ul = ln(interaction.locale as Locale);
	const name = interaction.fields.getTextInputValue("damageName");
	let value = interaction.fields.getTextInputValue("damageValue");
	
	const oldEmbeds = ensureOldEmbeds(interaction.message ?? undefined);
	const embed = new EmbedBuilder()
		.setTitle(ul("modals.embedTitle"))
		.setThumbnail(oldEmbeds.thumbnail?.url || "");
	//add old fields
	for (const field of oldEmbeds.fields) {
		embed.addFields(field);
	}
	const user = getUserByEmbed(oldEmbeds, ul);
	if (!user) throw new Error("[error.noUser]"); //mean that there is no embed
	try {
		value = evalStatsDice(value, user.stats);
	}
	catch (error) {
		const errorMsg = lError(error as Error, interaction);
		await interaction.reply({ content: errorMsg, ephemeral: true });
		return;
	}
	//add damage fields
	embed.addFields({
		name: `🔪 ${name}`,
		value,
		inline: true,
	});
	const components = first ? registerDmgButton(ul) : editUserButtons(ul);
	await interaction?.message?.edit({ embeds: [embed], components: [components] });
	await interaction.reply({ content: ul("modals.added"), ephemeral: true });
	return;
}