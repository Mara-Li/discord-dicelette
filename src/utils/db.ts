import { AutocompleteInteraction, BaseInteraction, ButtonInteraction, CommandInteraction, Guild, ModalSubmitInteraction, TextChannel } from "discord.js";
import fs from "fs";
import removeAccents from "remove-accents";

import { GuildData, StatisticalTemplate, User } from "../interface";
import { ln } from "../localizations";
import { verifyTemplateValue } from "./verify_template";

export async function getTemplate(interaction: ButtonInteraction | ModalSubmitInteraction): Promise<StatisticalTemplate|undefined> {
	const template = interaction.message?.attachments.first();
	if (!template) return;
	const res = await fetch(template.url).then(res => res.json());
	return verifyTemplateValue(res);
}

export function getGuildData(interaction: CommandInteraction | ButtonInteraction | ModalSubmitInteraction|AutocompleteInteraction): GuildData|undefined {
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
		};
		const data = fs.readFileSync("database.json", "utf-8");
		const json = JSON.parse(data);
		json[guild.id] = guildData;
		fs.writeFileSync("database.json", JSON.stringify(json, null, 2));
		throw new Error(ul.error.noTemplate);
	}
	const thread = (await channel.threads.fetch()).threads.find(thread => thread.name === "📝 • [STATS]") as TextChannel | undefined;
	if (!thread) 
		throw new Error(ul.error.noThread);
	try {
		const message = await thread.messages.fetch(userMessageId);
		const attachments = message.attachments.first();
		if (!attachments) return;
		return await fetch(attachments.url).then(res => res.json()) as User;
	} catch (error) {
		const index = userData.findIndex(char => char.messageId === userMessageId);
		userData.splice(index, 1);
		//update the database
		const data = fs.readFileSync("database.json", "utf-8");
		const json = JSON.parse(data);
		guildData.user[userId] = userData;
		json[guild.id] = guildData;
		fs.writeFileSync("database.json", JSON.stringify(json, null, 2));
		throw new Error(ul.error.user);
	}

	
}

export function registerUser(userID: string, interaction: ModalSubmitInteraction,msgId: string, charName?: string, ) {
	if (!interaction.guild) return;
	const guildData = getGuildData(interaction);
	if (charName) charName = removeAccents(charName).toLowerCase();
	if (!guildData) return;
	if (!guildData.user) guildData.user = {};
	const user = getUserData(guildData, userID);
	if (user) {
		const char = user.find(char => char.charName === charName);
		if (char)
			//overwrite the message id
			char.messageId = msgId;
		else user.push({ charName, messageId: msgId });	
	} else {
		guildData.user[userID] = [{
			charName,
			messageId: msgId
		}];
	}
	//update the database
	const data = fs.readFileSync("database.json", "utf-8");
	const json = JSON.parse(data);
	json[interaction.guild.id] = guildData;
	fs.writeFileSync("database.json", JSON.stringify(json, null, 2));
}