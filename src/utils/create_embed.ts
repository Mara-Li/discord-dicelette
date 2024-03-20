/* eslint-disable @typescript-eslint/no-unused-vars */
import { ButtonInteraction, EmbedBuilder, Locale, ModalSubmitInteraction, userMention } from "discord.js";

import { StatisticalTemplate, User } from "../interface";
import { lError, ln } from "../localizations";
import { repostInThread, title } from ".";
import { continueCancelButtons, editUserButtons,registerDmgButton } from "./buttons";
import { getStatistiqueFields, getUserByEmbed, parseEmbedFields } from "./parse";
import { ensureEmbed, evalCombinaison, evalStatsDice, getEmbeds } from "./verify_template";

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

export async function embedStatistiques(interaction: ModalSubmitInteraction, template: StatisticalTemplate, page=2) {
	if (!interaction.message) return;
	const ul = ln(interaction.locale as Locale);
	const oldEmbeds = ensureEmbed(interaction.message);
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
			await interaction.reply({ content: ul("modals.added"), ephemeral: true });
			return;	
		}
		await interaction.message.edit({ embeds: [embed], components: [continueCancelButtons(ul)] });
		await interaction.reply({ content: ul("modals.added"), ephemeral: true });
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
		.setTitle(ul("modals.embedTitle"))
		.setThumbnail(oldEmbeds.thumbnail?.url || "");
	let diceEmbed: EmbedBuilder | undefined = undefined;
	let statsEmbed: EmbedBuilder | undefined = undefined;
	for (const field of oldEmbeds.fields) {
		if (field.name.startsWith("🔪")) {
			if (!diceEmbed) {
				diceEmbed = new EmbedBuilder()
					.setTitle(ul("modals.diceTitle"))
					.setThumbnail(oldEmbeds.thumbnail?.url || "");
			}
			diceEmbed.addFields({
				name: title(field.name.replaceAll("🔪", "").trim()),
				value: field.value,
				inline: true,
			
			});
		} else if (field.name.startsWith("✏️")) {
			if (!statsEmbed) {
				statsEmbed = new EmbedBuilder()
					.setTitle(ul("modals.statsTitle"))
					.setThumbnail(oldEmbeds.thumbnail?.url || "");
			}
			statsEmbed.addFields({
				name: title(field.name.replace("✏️", "").trim()),
				value: field.value,
				inline: true,
			
			});
		} else userDataEmbed.addFields(field);
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
				if (!diceEmbed) {
					diceEmbed = new EmbedBuilder()
						.setTitle(ul("modals.diceTitle"))
						.setThumbnail(oldEmbeds.thumbnail?.url || "");
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
			.setTitle(ul("modals.template.title"))
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
	const allEmbeds = [userDataEmbed];
	if (statsEmbed) allEmbeds.push(statsEmbed);
	if (diceEmbed) allEmbeds.push(diceEmbed);
	if (templateEmbed) allEmbeds.push(templateEmbed);
	await repostInThread(allEmbeds, interaction, userStatistique, userID, ul);
	await interaction.reply({ content: ul("modals.finished"), ephemeral: true });
	return;
}

export async function registerDamageDice(interaction: ModalSubmitInteraction, first?: boolean) {
	const ul = ln(interaction.locale as Locale);
	const name = interaction.fields.getTextInputValue("damageName");
	let value = interaction.fields.getTextInputValue("damageValue");
	
	const oldDiceEmbeds = getEmbeds(ul, interaction.message ?? undefined, first ? "user" : "damage")?.toJSON();
	const userEmbed = ensureEmbed(interaction.message ?? undefined);
	const diceEmbed = oldDiceEmbeds ? new EmbedBuilder()
		.setTitle(ul("modals.diceTitle"))
		.setThumbnail(oldDiceEmbeds.thumbnail?.url || "") : 
		new EmbedBuilder()
			.setTitle(ul("modals.diceTitle"))
			.setThumbnail(userEmbed.thumbnail?.url || "");
	if (oldDiceEmbeds?.fields)
		for (const field of oldDiceEmbeds.fields) {
			diceEmbed.addFields(field);
		}
	const user = getUserByEmbed(ensureEmbed(interaction.message ?? undefined), ul);
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
	diceEmbed.addFields({
		name: `${name}`,
		value,
		inline: true,
	});
	if (!first) {
		const userEmbed = getEmbeds(ul, interaction.message ?? undefined, "user");
		if (!userEmbed) throw new Error("[error.noUser]"); //mean that there is no embed
		const statsEmbed = getEmbeds(ul, interaction.message ?? undefined, "stats");
		const templateEmbed = getEmbeds(ul, interaction.message ?? undefined, "template");
		const allEmbeds = [userEmbed];
		if (statsEmbed) allEmbeds.push(statsEmbed);
		if (diceEmbed) allEmbeds.push(diceEmbed);
		if (templateEmbed) allEmbeds.push(templateEmbed);
		const components = editUserButtons(ul);
		await interaction?.message?.edit({ embeds: allEmbeds, components: [components] });
		await interaction.reply({ content: ul("modals.added"), ephemeral: true });
		return;
	}
	const components = registerDmgButton(ul);
	await interaction?.message?.edit({ embeds: [diceEmbed], components: [components] });
	await interaction.reply({ content: ul("modals.added"), ephemeral: true });
	return;
}