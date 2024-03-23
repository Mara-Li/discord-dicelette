/* eslint-disable @typescript-eslint/no-unused-vars */
import { ButtonInteraction, EmbedBuilder, Locale, ModalSubmitInteraction, PermissionsBitField, User, userMention } from "discord.js";
import { TFunction } from "i18next";

import { StatisticalTemplate, UserData } from "../../interface";
import { ln } from "../../localizations";
import { cleanSkillName, cleanStatsName, repostInThread, title } from "../../utils";
import { continueCancelButtons,registerDmgButton } from "../../utils/buttons";
import { createEmbedsList, parseEmbedFields } from "../../utils/parse_embeds";
import { ensureEmbed } from "../../utils/verify_template";

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
		.setColor("Random")
		.setThumbnail(oldEmbeds.thumbnail?.url || "");
	let diceEmbed: EmbedBuilder | undefined = undefined;
	let statsEmbed: EmbedBuilder | undefined = undefined;
	for (const field of oldEmbeds.fields) {
		if (field.name.startsWith("🔪")) {
			if (!diceEmbed) {
				diceEmbed = new EmbedBuilder()
					.setColor("Green")
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
					.setColor("Aqua")
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
						.setColor("Green")
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
	const userStatistique: UserData = {
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
			.setColor("DarkerGrey");
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
export async function validate_user(interaction: ButtonInteraction, interactionUser: User, template: StatisticalTemplate, ul: TFunction<"translation", undefined>) {
	const isModerator = interaction.guild?.members.cache.get(interactionUser.id)?.permissions.has(PermissionsBitField.Flags.ManageRoles);
	if (isModerator)
		await validateUser(interaction, template);


	else
		await interaction.reply({ content: ul("modals.noPermission"), ephemeral: true });
}

