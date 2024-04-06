import { StatisticalTemplate, verifyTemplateValue } from "@dicelette/core";
import { AnyThreadChannel, BaseInteraction, ButtonInteraction, CategoryChannel, CommandInteraction, Embed, Guild, Message, ModalSubmitInteraction, NewsChannel, TextChannel } from "discord.js";
import { TFunction } from "i18next";
import removeAccents from "remove-accents";

import { Settings, UserData } from "../interface";
import { ln } from "../localizations";
import {removeEmojiAccents, searchUserChannel } from ".";
import { ensureEmbed,getEmbeds, parseEmbedFields, removeBacktick } from "./parse";

/**
 * Get the guild template when clicking on the "registering user" button or when submiting
 * @param interaction {ButtonInteraction}
 */
export async function getTemplate(interaction: ButtonInteraction | ModalSubmitInteraction): Promise<StatisticalTemplate|undefined> {
	const template = interaction.message?.attachments.first();
	if (!template) return;
	const res = await fetch(template.url).then(res => res.json());
	return verifyTemplateValue(res);
}



/**
 * Get the statistical Template using the database templateID information
 * @param interaction {ButtonInteraction | ModalSubmitInteraction}
 */
export async function getTemplateWithDB(interaction: ButtonInteraction | ModalSubmitInteraction | CommandInteraction, enmap: Settings) {
	if (!interaction.guild) return;
	const guild = interaction.guild;
	const templateID = enmap.get(interaction.guild.id, "templateID");

	if (!enmap.has(interaction.guild.id)||!templateID) throw new Error("No guild data");

	const {channelId, messageId} = templateID;
	const channel = await guild.channels.fetch(channelId);
	if (!channel || (channel instanceof CategoryChannel)) return;
	const message = await channel.messages.fetch(messageId);
	if (!message) throw new Error("No message found");
	const template = message.attachments.first();
	if (!template) throw new Error("No template found");
	const res = await fetch(template.url).then(res => res.json());
	return verifyTemplateValue(res);

}

/**
 * Create the UserData starting from the guildData and using a userId
 * @param guildData {GuildData}
 * @param userId {string}
 * @param guild {Guild}
 * @param interaction {BaseInteraction}
 * @param charName {string}
 */
export async function getUserFromMessage(guildData: Settings, userId: string, guild: Guild, interaction: BaseInteraction, charName?: string, integrateCombinaison: boolean = true) {
	const ul = ln(interaction.locale);
	const userData = guildData.get(guild.id, `user.${userId}`);
	if (!userData) return;
	const serizalizedCharName = charName ? removeAccents(charName).toLowerCase() : undefined;
	const user = guildData.get(guild.id, `user.${userId}`)?.find(char => {
		if (char.charName) return removeAccents(char.charName).toLowerCase() === serizalizedCharName;
		return char.charName === charName;
	});
	if (!user) return;
	const key = charName ? `${userId}.${charName}` : userId;
	const userMessageId = guildData.get(guild.id, `user.${key}.messageId`) as unknown as string;
	const thread = await searchUserChannel(guildData, interaction, ul);
	if (!thread) 
		throw new Error(ul("error.noThread"));
	try {
		const message = await thread.messages.fetch(userMessageId);
		return getUserByEmbed(message, ul, undefined, integrateCombinaison);
	} catch (error) {
		//remove the user with faulty messageId from the database
		const dbUser = guildData.get(guild.id, `user.${userId}`);
		if (!dbUser) return;
		const index = dbUser.findIndex(char => char.messageId === userMessageId);
		if (index === -1) return;
		dbUser.splice(index, 1);
		guildData.set(guild.id, dbUser, `user.${userId}`);
		throw new Error(ul("error.user"));
	}
}

/**


/**
 * Register an user in the database
 * @param userID {string}
 * @param interaction {BaseInteraction}
 * @param msgId {string}
 * @param thread {ThreadChannel}
 * @param charName {string|undefined}
 * @param damage {string[]|undefined}
 * @param deleteMsg {boolean=true} delete the old message if needed (overwriting user)
 * @returns 
 */
export async function registerUser(userID: string, interaction: BaseInteraction, msgId: string, thread: AnyThreadChannel | TextChannel | NewsChannel, enmap: Settings, charName?: string, damage?: string[], deleteMsg: boolean = true) {
	if (!interaction.guild) return;
	const guildData = enmap.get(interaction.guild.id);
	if (charName) charName = charName.toLowerCase();
	if (!guildData) return;
	if (!guildData.user) guildData.user = {};
	if (damage && guildData.templateID.damageName && guildData.templateID.damageName.length > 0) {
		//filter the damage list and remove the guildData.templateID.damageName
		damage = damage.filter(damage => !guildData.templateID.damageName.includes(damage));
	}
	const user = enmap.get(interaction.guild.id, `user.${userID}`);
	if (user) {
		const char = user.find(char => char.charName === charName);
		if (char){
			//delete old message
			if (deleteMsg) 
			{
				try {
					const oldMessage = await thread.messages.fetch(char.messageId);
					if (oldMessage) oldMessage.delete();
				} catch (error) {
					//skip unknow message
				}
			}
			//overwrite the message id
			char.messageId = msgId;
			char.damageName = damage;
		}
		else user.push({ charName, messageId: msgId, damageName: damage });	
	} else {
		guildData.user[userID] = [{
			charName,
			messageId: msgId, 
			damageName: damage
		}];
	}
	//update the database
	enmap.set(interaction.guild.id, guildData);
}

/**
 * Get the userData from the embed
 * @param message {Message}
 * @param ul {TFunction<"translation", undefined>}
 * @param first {boolean=false} Indicate it the registering of the user or an edit
 */
export function getUserByEmbed(message: Message, ul: TFunction<"translation", undefined>, first: boolean = false, integrateCombinaison: boolean = true) {
	const user: Partial<UserData> = {};
	const userEmbed = first ? ensureEmbed(message) : getEmbeds(ul, message, "user");
	if (!userEmbed) return;
	const parsedFields = parseEmbedFields(userEmbed.toJSON() as Embed);
	if (parsedFields[ul("common.charName")] !== ul("common.noSet")) {
		user.userName = parsedFields[ul("common.charName")];
	}
	const templateStat = first ? userEmbed.toJSON().fields : getEmbeds(ul, message, "stats")?.toJSON()?.fields;
	let stats: {[name: string]: number} | undefined = undefined;
	if (templateStat) {
		stats = {};
		for (const stat of templateStat) {
			const value = parseInt(removeBacktick(stat.value), 10);
			if (isNaN(value)) {
				//it's a combinaison 
				//remove the `x` = text;
				const combinaison = stat.value.split("=")[1].trim();
				if (integrateCombinaison)
					stats[removeEmojiAccents(stat.name)] = parseInt(combinaison, 10);
			}
			else stats[removeEmojiAccents(stat.name)] = value;
		}
	}
	user.stats = stats;
	const damageFields = first ? userEmbed.toJSON().fields : getEmbeds(ul, message, "damage")?.toJSON()?.fields;
	let templateDamage: {[name: string]: string} | undefined = undefined;
	if (damageFields) {
		templateDamage = {};
		for (const damage of damageFields) {
			templateDamage[removeEmojiAccents(damage.name)] = removeBacktick(damage.value);
		}
	}
	const templateEmbed = first ? userEmbed : getEmbeds(ul, message, "template");
	const templateFields = parseEmbedFields(templateEmbed?.toJSON() as Embed);
	user.damage = templateDamage;
	user.template = {
		diceType: templateFields?.[ul("common.dice")] || undefined,
		critical: {
			success: templateFields?.[ul("roll.critical.success")] ? parseInt(parsedFields[ul("roll.critical.success")], 10) : undefined,
			failure: templateFields?.[ul("roll.critical.failure")] ? parseInt(parsedFields[ul("roll.critical.failure")], 10) : undefined,
		}
	};
	return user as UserData;

}

/**
 * Register the managerId in the database
 * @param {GuildData} guildData 
 * @param {BaseInteraction} interaction 
 * @param {string} channel 
 */
export function registerManagerID(guildData: Settings, interaction: BaseInteraction, channel?: string) {
	if (!channel) return;
	const guildId = interaction.guild?.id;
	if (!guildId) return;
	guildData.set(interaction.guild.id, "managerId", channel);
}