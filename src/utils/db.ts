import { AnyThreadChannel, BaseInteraction, ButtonInteraction, CategoryChannel, Embed, Guild, Message, ModalSubmitInteraction, NewsChannel, TextChannel } from "discord.js";
import fs from "fs";
import { TFunction } from "i18next";
import removeAccents from "remove-accents";

import { GuildData, StatisticalTemplate, UserData } from "../interface";
import { ln } from "../localizations";
import {removeEmojiAccents, searchUserChannel } from ".";
import { getEmbeds, parseEmbedFields, removeBacktick } from "./parse";
import { ensureEmbed, verifyTemplateValue } from "./verify_template";

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
 * Get the guildDate from database when interacting with the bot
 * @param interaction {BaseInteraction}
 * @returns 
 */
export function guildInteractionData(interaction: BaseInteraction): GuildData|undefined {
	if (!interaction.guild) return;
	const guildData = interaction.guild.id;
	const data = fs.readFileSync("database.json", "utf-8");
	const parsedData = JSON.parse(data);
	if (!parsedData[guildData]) return;
	return parsedData[guildData] as GuildData;
}

/**
 * Get the statistical Template using the database templateID information
 * @param interaction {ButtonInteraction | ModalSubmitInteraction}
 */
export async function getTemplateWithDB(interaction: ButtonInteraction | ModalSubmitInteraction) {
	if (!interaction.guild) return;
	const guild = interaction.guild;
	const guildData = guildInteractionData(interaction);
	if (!guildData) throw new Error("No guild data");
	const {channelId, messageId} = guildData.templateID;
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
 * Get the userData from database
 * @param guildData {GuildData}
 * @param userId {string}
 */
export function getUserData(guildData: GuildData, userId: string) {
	if (!guildData.user) return undefined;
	return guildData.user[userId];
}

/**
 * Create the UserData starting from the guildData and using a userId
 * @param guildData {GuildData}
 * @param userId {string}
 * @param guild {Guild}
 * @param interaction {BaseInteraction}
 * @param charName {string}
 */
export async function getUserFromMessage(guildData: GuildData, userId: string, guild: Guild, interaction: BaseInteraction, charName?: string) {
	const ul = ln(interaction.locale);
	const userData = getUserData(guildData, userId);
	if (!userData) return;
	const user = userData.find(char => {
		if (char.charName && charName) return removeAccents(char.charName).toLowerCase() === removeAccents(charName.toLowerCase());
		return char.charName === charName;
	});
	if (!user) return;
	const mainChannel = guildData.templateID.channelId;
	const userMessageId = user.messageId;
	const channel = await guild.channels.fetch(mainChannel);
	if (!channel || !(channel instanceof TextChannel)) {
		//clean the database
		guildData.templateID = {
			channelId: "",
			messageId: "",
			statsName: [],
			damageName: []
		};
		const data = fs.readFileSync("database.json", "utf-8");
		const json = JSON.parse(data);
		json[guild.id] = guildData;
		fs.writeFileSync("database.json", JSON.stringify(json, null, 2));
		throw new Error(ul("error.noTemplate"));
	}
	const thread = await searchUserChannel(guildData, interaction, ul);
	if (!thread) 
		throw new Error(ul("error.noThread"));
	try {
		const message = await thread.messages.fetch(userMessageId);
		return getUserByEmbed(message, ul);
	} catch (error) {
		const index = userData.findIndex(char => char.messageId === userMessageId);
		userData.splice(index, 1);
		//update the database
		const data = fs.readFileSync("database.json", "utf-8");
		const json = JSON.parse(data);
		guildData.user[userId] = userData;
		json[guild.id] = guildData;
		fs.writeFileSync("database.json", JSON.stringify(json, null, 2));
		throw new Error(ul("error.user"));
	}
}

/**
 * Read and parse the database and return the database and parsedDb with guildID
 * @param guildID {string}
 */
export function readDB(guildID: string) {
	const database = fs.readFileSync("database.json", "utf-8");
	const parsedDatabase = JSON.parse(database);
	if (!parsedDatabase[guildID]) return;
	const db = parsedDatabase[guildID] as Partial<GuildData>;
	return {db, parsedDatabase};
}

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
export async function registerUser(userID: string, interaction: BaseInteraction, msgId: string, thread: AnyThreadChannel | TextChannel | NewsChannel, charName?: string, damage?: string[], deleteMsg: boolean = true) {
	if (!interaction.guild) return;
	const guildData = guildInteractionData(interaction);
	if (charName) charName = charName.toLowerCase();
	if (!guildData) return;
	if (!guildData.user) guildData.user = {};
	if (damage && guildData.templateID.damageName && guildData.templateID.damageName.length > 0) {
		//filter the damage list and remove the guildData.templateID.damageName
		damage = damage.filter(damage => !guildData.templateID.damageName.includes(damage));
	}
	const user = getUserData(guildData, userID);
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
	const data = fs.readFileSync("database.json", "utf-8");
	const json = JSON.parse(data);
	json[interaction.guild.id] = guildData;
	fs.writeFileSync("database.json", JSON.stringify(json, null, 2));
}

/**
 * Get the userData from the embed
 * @param message {Message}
 * @param ul {TFunction<"translation", undefined>}
 * @param first {boolean=false} Indicate it the registering of the user or an edit
 */
export function getUserByEmbed(message: Message, ul: TFunction<"translation", undefined>, first: boolean = false) {
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
			stats[removeEmojiAccents(stat.name)] = parseInt(removeBacktick(stat.value), 10);
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
export function registerManagerID(guildData: GuildData, interaction: BaseInteraction, channel?: string) {
	if (!channel) return;
	guildData.managerId = channel;
	const guildId = interaction.guild?.id;
	if (!guildId) return;
	const data = fs.readFileSync("database.json", "utf-8");
	const json = JSON.parse(data);
	json[interaction.guild.id] = guildData;
}