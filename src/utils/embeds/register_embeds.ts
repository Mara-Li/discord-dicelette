/* eslint-disable @typescript-eslint/no-unused-vars */
import { ButtonInteraction, EmbedBuilder, Locale, ModalSubmitInteraction, ThreadChannel, userMention } from "discord.js";
import removeAccents from "remove-accents";

import { StatisticalTemplate, User } from "../../interface";
import { lError, ln } from "../../localizations";
import { cleanSkillName, cleanStatsName, repostInThread, title } from "..";
import { continueCancelButtons, editUserButtons,registerDmgButton } from "../buttons";
import { getUserByEmbed, registerUser } from "../db";
import { getStatistiqueFields } from "../modals/parse_value";
import { ensureEmbed, evalCombinaison, evalStatsDice } from "../verify_template";
import { createEmbedsList, getEmbeds, parseEmbedFields } from "./parse";

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
		.setTitle(ul("embed.add.title"))
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

export async function embedStatistiques(interaction: ModalSubmitInteraction, template: StatisticalTemplate, page=2) {
	if (!interaction.message) return;
	const ul = ln(interaction.locale as Locale);
	const oldEmbeds = ensureEmbed(interaction.message);
	try {
		const {combinaisonFields, stats} = getStatistiqueFields(interaction, template);
		//combine all embeds as one
		const embed = new EmbedBuilder()
			.setTitle(ul("embed.add.title"))
			.setThumbnail(oldEmbeds.thumbnail?.url || "")
			.setFooter({ text: ul("common.page", {nb: page}) });
		//add old fields
		for (const field of oldEmbeds.fields) {
			embed.addFields(field);
		}
		for (const [stat, value] of Object.entries(stats)) {
			embed.addFields({
				name: title(`✏️ ${title(stat)}`),
				value: value.toString(),
				inline: true,
			});
		}
		const statsWithoutCombinaison = template.statistics ? Object.keys(template.statistics).filter(stat => !template.statistics![stat].combinaison) : [];
		const embedObject = embed.toJSON();
		const fields = embedObject.fields;
		if (!fields) return;
		const parsedFields: {[name: string]: string} = {};
		for (const field of fields) {
			parsedFields[field.name.toLowerCase().replace("✏️", "").trim()] = field.value.toLowerCase();
		}
		
		const embedStats = Object.fromEntries(Object.entries(parsedFields).filter(
			([key, _]) => statsWithoutCombinaison.includes(key)
		));
		if (Object.keys(embedStats).length === statsWithoutCombinaison.length) {
			let combinaison:{[name: string]: number} = {};
			try {
				combinaison = evalCombinaison(combinaisonFields, embedStats);
				//add combinaison to the embed
				for (const stat of Object.keys(combinaison)) {
					embed.addFields({
						name: title(`✏️ ${title(stat)}`),
						value: `\`${combinaisonFields[stat]}\` = ${combinaison[stat]}`,
						inline: true,
					});
				}
			} catch (error) {
				const errorMsg = lError(error as Error, interaction);
				await interaction.reply({ content: errorMsg, ephemeral: true });
				return;
			}
			await interaction.message.edit({ embeds: [embed], components: [registerDmgButton(ul)] });
			await interaction.reply({ content: ul("modals.added.stats"), ephemeral: true });
			return;	
		}
		await interaction.message.edit({ embeds: [embed], components: [continueCancelButtons(ul)] });
		await interaction.reply({ content: ul("modals.added.stats"), ephemeral: true });
		return;
	} catch (error) {
		const errorMsg = lError(error as Error, interaction);
		await interaction.reply({ content: errorMsg, ephemeral: true });
	}
}

export async function validateUser(interaction: ButtonInteraction, template: StatisticalTemplate) {
	const ul = ln(interaction.locale as Locale);
	const oldEmbeds = ensureEmbed(interaction.message);
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
	const userDataEmbed = new EmbedBuilder()
		.setTitle(ul("embed.user"))
		.setThumbnail(oldEmbeds.thumbnail?.url || "");
	let diceEmbed: EmbedBuilder | undefined = undefined;
	let statsEmbed: EmbedBuilder | undefined = undefined;
	for (const field of oldEmbeds.fields) {
		if (field.name.startsWith("🔪")) {
			if (!diceEmbed) {
				diceEmbed = new EmbedBuilder()
					.setTitle(ul("embed.dice"));
			}
			diceEmbed.addFields({
				name: title(cleanSkillName(field.name)),
				value: field.value,
				inline: true,
			
			});
		} else if (field.name.startsWith("✏️")) {
			if (!statsEmbed) {
				statsEmbed = new EmbedBuilder()
					.setTitle(ul("embed.stats"));
			}
			statsEmbed.addFields({
				name: title(cleanStatsName(field.name)),
				value: field.value,
				inline: true,
			
			});
		} else userDataEmbed.addFields(field);
	}
	const templateStat = template.statistics ? Object.keys(template.statistics) : [];
	const stats: {[name: string]: number} = {};
	for (const stat of templateStat) {
		stats[stat] = parseInt(parsedFields[cleanStatsName(stat)], 10);
	}
	const damageFields = oldEmbeds.fields.filter(field => field.name.startsWith("🔪"));
	let templateDamage: {[name: string]: string} | undefined = undefined;
	
	if (damageFields.length > 0) {
		templateDamage = {};
		
		for (const damage of damageFields) {
			templateDamage[cleanSkillName(damage.name)] = damage.value;
		}
		if (template.damage)
			for (const [name, dice] of Object.entries(template.damage)) {
				templateDamage[name] = dice;
				if (!diceEmbed) {
					diceEmbed = new EmbedBuilder()
						.setTitle(ul("embed.dice"));
				}
				diceEmbed.addFields({
					name: `${name}`,
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
	let templateEmbed: EmbedBuilder | undefined = undefined;
	if (template.diceType || template.critical) {
		templateEmbed = new EmbedBuilder()
			.setTitle(ul("embed.template"))
			.setColor("Aqua");
		if (template.diceType)
			templateEmbed.addFields({
				name: ul("common.dice"),
				value: template.diceType,
				inline: true,
			});
		if (template.critical?.success){
			templateEmbed.addFields({
				name: ul("roll.critical.success"),
				value: template.critical.success.toString(),
				inline: true,
			});	
		}
		if (template.critical?.failure){
			templateEmbed.addFields({
				name: ul("roll.critical.failure"),
				value: template.critical.failure.toString(),
				inline: true,
			});	
		}
	}
	await interaction?.message?.delete();
	const allEmbeds = createEmbedsList(userDataEmbed, statsEmbed, diceEmbed, templateEmbed);
	await repostInThread(allEmbeds, interaction, userStatistique, userID, ul, {stats: userDataEmbed ? true : false, dice: diceEmbed ? true : false, template: templateEmbed ? true : false});
	await interaction.reply({ content: ul("modals.finished"), ephemeral: true });
	return;
}

export async function registerDamageDice(interaction: ModalSubmitInteraction, first?: boolean) {
	const ul = ln(interaction.locale as Locale);
	const name = interaction.fields.getTextInputValue("damageName");
	let value = interaction.fields.getTextInputValue("damageValue");
	if (!interaction.message) throw new Error(ul("error.noMessage"));
	const oldDiceEmbeds = first ? ensureEmbed(interaction.message).toJSON() : getEmbeds(ul, interaction.message ?? undefined, "damage")?.toJSON();
	const diceEmbed = oldDiceEmbeds ? new EmbedBuilder(oldDiceEmbeds) : new EmbedBuilder()
		.setTitle(ul("embed.dice"));
	if (oldDiceEmbeds?.fields)
		for (const field of oldDiceEmbeds.fields) {
			//add fields only if not already in the diceEmbed
			if (diceEmbed.toJSON().fields?.findIndex(f => cleanSkillName(f.name) === cleanSkillName(field.name)) === -1){
				diceEmbed.addFields(field);
			}
		}
	const user = getUserByEmbed(interaction.message, ul, first);
	if (!user) throw new Error(ul("error.user")); //mean that there is no embed
	try {
		value = evalStatsDice(value, user.stats);
	}
	catch (error) {
		const errorMsg = lError(error as Error, interaction);
		await interaction.reply({ content: errorMsg, ephemeral: true });
		return;
	}
	if (diceEmbed.toJSON().fields?.findIndex(f => cleanSkillName(f.name) === cleanSkillName(name)) === -1 || !diceEmbed.toJSON().fields){
		diceEmbed.addFields({
			name: first ? `🔪${title(removeAccents(name))}` : title(removeAccents(name)),
			value,
			inline: true,
		});}
	if (!first) {
		const userEmbed = getEmbeds(ul, interaction.message ?? undefined, "user");
		if (!userEmbed) throw new Error("[error.noUser]"); //mean that there is no embed
		const statsEmbed = getEmbeds(ul, interaction.message ?? undefined, "stats");
		const templateEmbed = getEmbeds(ul, interaction.message ?? undefined, "template");
		const allEmbeds = [userEmbed];
		if (statsEmbed) allEmbeds.push(statsEmbed);
		allEmbeds.push(diceEmbed);
		if (templateEmbed) allEmbeds.push(templateEmbed);
		const components = editUserButtons(ul, statsEmbed ? true: false, true, templateEmbed ? true : false);
		const userID = userEmbed.toJSON().fields?.find(field => field.name === ul("common.user"))?.value.replace("<@", "").replace(">", "");
		if (!userID) throw new Error(ul("error.user"));
		if (!interaction.channel || !(interaction.channel instanceof ThreadChannel)) throw new Error(ul("error.noThread"));
		let userName = userEmbed.toJSON().fields?.find(field => field.name === ul("common.charName"))?.value;
		if (userName === ul("common.noSet")) userName = undefined;
		const damageName = diceEmbed.toJSON().fields?.reduce((acc, field) => {
			acc[cleanSkillName(field.name)] = field.value;
			return acc;
		}, {} as {[name: string]: string});
		registerUser(userID, interaction, interaction.message.id, interaction.channel, userName, damageName ? Object.keys(damageName) : undefined, false);
		await interaction?.message?.edit({ embeds: allEmbeds, components: [components] });
		await interaction.reply({ content: ul("modals.added.dice"), ephemeral: true });
		return;
	}
	const components = registerDmgButton(ul);
	await interaction?.message?.edit({ embeds: [diceEmbed], components: [components] });
	await interaction.reply({ content: ul("modals.added.dice"), ephemeral: true });
	return;
}