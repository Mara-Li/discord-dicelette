import {GuildTextBasedChannel, NonThreadGuildBasedChannel, TextChannel, ThreadChannel} from "discord.js";
import fs from "fs";

import { EClient } from "..";
import { GuildData } from "../interface";
import { readDB } from "../utils/db";

export const delete_channel = (client	: EClient): void => {
	client.on("channelDelete", async (channel) => {
		try {
			if (channel.isDMBased()) return;
			const channelID = channel.id;
			//search channelID in database and delete it
			const guildID = channel.guild.id;
			const database = fs.readFileSync("database.json", "utf-8");
			const parsedDatabase = JSON.parse(database);
			if (!parsedDatabase[guildID]) return;
			const guildDb = parsedDatabase[guildID] as Partial<GuildData>;
			if (guildDb?.templateID?.channelId === channelID) {
				delete guildDb.templateID;
			}
			if (guildDb.logs === channelID) delete guildDb.logs;
			if (guildDb.managerId === channelID) {
				delete guildDb.managerId;
				cleanUserDB(guildDb, channel);
			}
			fs.writeFileSync("database.json", JSON.stringify(parsedDatabase, null, 2), "utf-8");
		} catch (error) {
			console.error(error);
			if (channel.isDMBased()) return;
			const db = readDB(channel.guild.id);
			if (!db) return;
			if (db.db.logs) {
				const logs = await channel.guild.channels.fetch(db.db.logs);
				if (logs instanceof TextChannel) {
					logs.send(`\`\`\`\n${(error as Error).message}\n\`\`\``);
				}
			}
		}
		
	});
};

export const delete_thread = (client: EClient): void => {
	client.on("threadDelete", async (thread) => {
		try {
			//search channelID in database and delete it
			const guildID = thread.guild.id;
			const database = fs.readFileSync("database.json", "utf-8");
			const parsedDatabase = JSON.parse(database);
			if (!parsedDatabase[guildID]) return;
			const guildDB = parsedDatabase[guildID] as Partial<GuildData>;
			if ((thread.name === "📝 • [STATS]" && thread.parentId === guildDB.templateID?.channelId) || thread.id === guildDB.managerId) {
				//verify if the user message was in the thread
				cleanUserDB(guildDB, thread);
			}
			if (guildDB.logs === thread.id) delete guildDB.logs;
			if (guildDB.templateID?.channelId === thread.id) delete guildDB.templateID;
			fs.writeFileSync("database.json", JSON.stringify(parsedDatabase, null, 2), "utf-8");
		} catch (error) {
			console.error(error);
			if (thread.isDMBased()) return;
			const db = readDB(thread.guild.id);
			if (!db) return;
			if (db.db.logs) {
				const logs = await thread.guild.channels.fetch(db.db.logs);
				if (logs instanceof TextChannel) {
					logs.send(`\`\`\`\n${(error as Error).message}\n\`\`\``);
				}
			}
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
			const database = fs.readFileSync("database.json", "utf-8");
			const parsedDatabase = JSON.parse(database);
			if (!parsedDatabase[guildID]) return;
			const guildData = parsedDatabase[guildID] as Partial<GuildData>;
			if (guildData?.templateID?.messageId === messageId) {
				delete guildData.templateID;
			}
			const dbUser = guildData?.user;
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
			fs.writeFileSync("database.json", JSON.stringify(parsedDatabase, null, 2), "utf-8");
		} catch (error) {
			if (!message.guild) return;
			const db = readDB(message.guild.id);
			if (!db) return;
			if (db.db.logs) {
				const logs = await message.guild.channels.fetch(db.db.logs);
				if (logs instanceof TextChannel) {
					logs.send(`\`\`\`\n${(error as Error).message}\n\`\`\``);
				}
			}
		}
	});
};

export const on_kick = (client: EClient): void => {
	client.on("guildDelete", async (guild) => {
		//delete guild from database
		try {
			const guildID = guild.id;
			const data = fs.readFileSync("database.json", "utf-8");
			const json = JSON.parse(data);
			if (json[guildID]) delete json[guildID];
			fs.writeFileSync("database.json", JSON.stringify(json, null, 2));
		} catch (error) {
			console.error(error);
		}
	});
};

function cleanUserDB(guildDB: Partial<GuildData>, thread: GuildTextBasedChannel | ThreadChannel | NonThreadGuildBasedChannel) {
	const dbUser = guildDB?.user;
	if (!dbUser) return;
	if (!(thread instanceof TextChannel)) return;
	for (const [user, data] of Object.entries(dbUser)) {
		const oldMessage = thread.messages.cache.find(message => data.some(char => char.messageId === message.id));
		if (oldMessage) delete dbUser[user];
	}
}