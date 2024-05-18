import { error as err } from "@console";
import { GuildData } from "@interface";
import { EClient } from "@main";
import { isStatsThread, sendLogs } from "@utils";
import {CommandInteraction, GuildTextBasedChannel, NonThreadGuildBasedChannel, TextChannel, ThreadChannel, User} from "discord.js";
import Enmap from "enmap";
import removeAccents from "remove-accents";

export const delete_channel = (client	: EClient): void => {
	client.on("channelDelete", async (channel) => {
		try {
			if (channel.isDMBased()) return;
			const channelID = channel.id;
			//search channelID in database and delete it
			const guildID = channel.guild.id;
			const db = client.settings;
			if (db.get(guildID, "templateID.channelId") === channelID) db.delete(guildID, "templateID");
			if (db.get(guildID, "logs") === channelID) db.delete(guildID, "logs");
			if (db.get(guildID, "managerId") === channelID) db.delete(guildID, "managerId");
			if (db.get(guildID, "privateChannel") === channelID) db.delete(guildID, "privateChannel");
			if (db.get(guildID, "rollChannel") === channelID) db.delete(guildID, "rollChannel");
			
		} catch (error) {
			err(error);
			if (channel.isDMBased()) return;
			sendLogs((error as Error).message, channel.guild, client.settings);
		}
		
	});
};

export const delete_thread = (client: EClient): void => {
	client.on("threadDelete", async (thread) => {
		try {
			//search channelID in database and delete it
			const guildID = thread.guild.id;
			const db = client.settings;
			if (isStatsThread(client.settings, guildID, thread) || thread.id === db.get(guildID, "managerId") || thread.id === db.get(guildID, "privateChannel")) {
				//verify if the user message was in the thread
				cleanUserDB(db, thread);
			}
			if (db.get(guildID, "logs") === thread.id) db.delete(guildID, "logs");
			if (db.get(guildID, "template.channelId") === thread.id) db.delete(guildID, "template");
		} catch (error) {
			err(error);
			if (thread.isDMBased()) return;
			sendLogs((error as Error).message, thread.guild, client.settings);
		}
	});
};

export const delete_message = (client: EClient): void => {
	client.on("messageDelete", async (message) => {
		try {
			if (!message.guild) return;
			const messageId = message.id;
			//search channelID in database and delete it
			const guildID = message.guild.id;
			console.log(message.channel.id, message.thread?.id);
			const channel = message.channel;
			if (channel.isDMBased()) return;
			if (client.settings.get(guildID, "templateID.messageId") === messageId) client.settings.delete(guildID, "templateID");
			
			const dbUser = client.settings.get(guildID, "user");
			if (dbUser && Object.keys(dbUser).length > 0){
				for (const [user, values] of Object.entries(dbUser)) {
					for (const [index, value] of values.entries()) {
						if (value.messageId === messageId) {
							values.splice(index, 1);
						}
					}
					if (values.length === 0) delete dbUser[user];
				}
			}
			client.settings.set(guildID, dbUser, "user");
		} catch (error) {
			if (!message.guild) return;
			sendLogs((error as Error).message, message.guild, client.settings);
		}
	});
};

export const on_kick = (client: EClient): void => {
	client.on("guildDelete", async (guild) => {
		//delete guild from database
		try {
			client.settings.delete(guild.id);
		} catch (error) {
			err(error);
		}
	});
};

function cleanUserDB(guildDB: Enmap<string, GuildData, unknown>, thread: GuildTextBasedChannel | ThreadChannel | NonThreadGuildBasedChannel) {
	const dbUser = guildDB.get(thread.guild.id, "user");
	if (!dbUser) return;
	if (!(thread instanceof TextChannel)) return;
	for (const [user, data] of Object.entries(dbUser)) {
		const oldMessage = thread.messages.cache.find(message => data.some(char => char.messageId === message.id));
		if (oldMessage) guildDB.delete(thread.guild.id, `user.${user}`);
	}
}

export function deleteUser(
	interaction: CommandInteraction,
	guildData: GuildData,
	user?: User | null,
	charName?: string,
) {
	//delete the character from the database
	const userCharIndex = guildData.user[user?.id ?? interaction.user.id].findIndex((char) => {
		if (char.charName && charName) return removeAccents(char.charName).toLowerCase() === removeAccents(charName).toLowerCase();
		return (charName === undefined && char.charName === undefined);
	});
	if (userCharIndex === -1) {
		return guildData;
	}
	guildData.user[user?.id ?? interaction.user.id].splice(userCharIndex, 1);
	return guildData;
}