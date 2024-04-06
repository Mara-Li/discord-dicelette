import {GuildTextBasedChannel, NonThreadGuildBasedChannel, TextChannel, ThreadChannel} from "discord.js";
import Enmap from "enmap";

import { EClient } from "..";
import { GuildData } from "../interface";
import { sendLogs } from "../utils";

export const delete_channel = (client	: EClient): void => {
	client.on("channelDelete", async (channel) => {
		try {
			if (channel.isDMBased()) return;
			const channelID = channel.id;
			//search channelID in database and delete it
			const guildID = channel.guild.id;
			const db = client.settings;
			if (db.get(guildID, "templateID.channelId") === channelID) {
				db.delete(guildID, "templateID");
			}
			if (db.get(guildID, "logs") === channelID) {
				db.delete(guildID, "logs");
			}
			if (db.get(guildID, "managerId") === channelID) {
				db.delete(guildID, "managerId");
			}
			if (db.get(guildID, "rollChannel") === channelID) {
				db.delete(guildID, "rollChannel");
			}
		} catch (error) {
			console.error(error);
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
			if ((thread.name === "📝 • [STATS]" && thread.parentId === db.get(guildID, "templateID.channelId")) || thread.id === db.get(guildID, "templateID.managerId")) {
				//verify if the user message was in the thread
				cleanUserDB(db, thread);
			}
			if (db.get(guildID, "logs") === thread.id) db.delete(guildID, "logs");
			if (db.get(guildID, "templateID.channelId") === thread.id) db.delete(guildID, "templateID");
		} catch (error) {
			console.error(error);
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
			
			if (client.settings.get(guildID, "templateID.messageId") === messageId) {
				client.settings.delete(guildID, "templateID");
			}
			const dbUser = client.settings.get(guildID, "user");
			if (dbUser && Object.keys(dbUser).length > 0){
				for (const [user, values] of Object.entries(dbUser)) {
					if (values.length === 0) continue;
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
			console.error(error);
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