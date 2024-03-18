import { BaseInteraction, ButtonInteraction, Guild, ModalSubmitInteraction, TextChannel, ThreadChannel } from "discord.js";
import fs from "fs";
import removeAccents from "remove-accents";

import { GuildData, StatisticalTemplate } from "../interface";
import { ln } from "../localizations";
import { getUserByEmbed } from "./parse";
import { verifyTemplateValue } from "./verify_template";

export async function getTemplate(interaction: ButtonInteraction | ModalSubmitInteraction): Promise<StatisticalTemplate|undefined> {
	const template = interaction.message?.attachments.first();
	if (!template) return;
	const res = await fetch(template.url).then(res => res.json());
	return verifyTemplateValue(res);
}

export function getGuildData(interaction: BaseInteraction): GuildData|undefined {
	if (!interaction.guild) return;
	const guildData = interaction.guild.id;
	const data = fs.readFileSync("database.json", "utf-8");
	const parsedData = JSON.parse(data);
	if (!parsedData[guildData]) return;
	return parsedData[guildData] as GuildData;
}

export async function getTemplateWithDB(interaction: ButtonInteraction | ModalSubmitInteraction) {
	if (!interaction.guild) return;
	const guild = interaction.guild;
	const guildData = getGuildData(interaction);
	if (!guildData) return;
	const {channelId, messageId} = guildData.templateID;
	const channel = await guild.channels.fetch(channelId);
	if (!channel || !(channel instanceof TextChannel)) return;
	const message = await channel.messages.fetch(messageId);
	if (!message) return;
	const template = message.attachments.first();
	if (!template) return;
	const res = await fetch(template.url).then(res => res.json());
	return verifyTemplateValue(res);

}

export function getUserData(guildData: GuildData, userId: string) {
	if (!guildData.user) return undefined;
	return guildData.user[userId];
}


export async function getUserFromMessage(guildData: GuildData, userId: string, guild: Guild, interaction: BaseInteraction, charName?: string) {
	const ul = ln(interaction.locale);
	const userData = getUserData(guildData, userId);
	if (!userData) return;
	const user = userData.find(char => char.charName === charName);
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
	const thread = (await channel.threads.fetch()).threads.find(thread => thread.name === "📝 • [STATS]") as TextChannel | undefined;
	if (!thread) 
		throw new Error(ul("error.noThread"));
	try {
		const message = await thread.messages.fetch(userMessageId);
		const embed = message.embeds[0];
		if (!embed) return;
		return getUserByEmbed(embed, ul);
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

export function readDB(guildID: string) {
	const database = fs.readFileSync("database.json", "utf-8");
	const parsedDatabase = JSON.parse(database);
	if (!parsedDatabase[guildID]) return;
	const db = parsedDatabase[guildID] as Partial<GuildData>;
	return {db, parsedDatabase};
}

export async function registerUser(userID: string, interaction: BaseInteraction,msgId: string, thread: ThreadChannel, charName?: string, damage?: string[]) {
	if (!interaction.guild) return;
	const guildData = getGuildData(interaction);
	if (charName) charName = removeAccents(charName).toLowerCase();
	if (!guildData) return;
	if (!guildData.user) guildData.user = {};
	if (damage && guildData.templateID.damageName.length > 0) {
		//filter the damage list and remove the guildData.templateID.damageName
		damage = damage.filter(damage => !guildData.templateID.damageName.includes(damage));
	}
	const user = getUserData(guildData, userID);
	if (user) {
		const char = user.find(char => char.charName === charName);
		if (char){
			//delete old message
			try {
				const oldMessage = await thread.messages.fetch(char.messageId);
				if (oldMessage) oldMessage.delete();
			} catch (error) {
				console.error(error);
				//skip unknow message
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