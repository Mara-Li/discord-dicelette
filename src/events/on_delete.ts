import {Client, TextChannel} from "discord.js";
import fs from "fs";

import { GuildData } from "../interface";
import { readDB } from "../utils/db";

export const delete_channel = (client	: Client): void => {
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

export const delete_thread = (client: Client): void => {
	client.on("threadDelete", async (thread) => {
		try {
			//search channelID in database and delete it
			const guildID = thread.guild.id;
			const database = fs.readFileSync("database.json", "utf-8");
			const parsedDatabase = JSON.parse(database);
			if (!parsedDatabase[guildID]) return;
			const guildDB = parsedDatabase[guildID] as Partial<GuildData>;
			if (thread.name === "📝 • [STATS]" && thread.parentId === guildDB.templateID?.channelId) {
				//verify if the user message was in the thread
				const dbUser = guildDB?.user;
				if (!dbUser) return;
				for (const [user, data] of Object.entries(dbUser)) {
					const oldMessage = thread.messages.cache.find(message => data.some(char => char.messageId === message.id));
					if (oldMessage) delete dbUser[user];
				}			
			}
			if (guildDB.logs === thread.id) delete guildDB.logs;
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

export const delete_message = (client	: Client): void => {
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
				for (const values of Object.values(dbUser)) {
					if (values.length === 0) continue;
					for (const [index, value] of values.entries()) {
						if (value.messageId === messageId) {
							values.splice(index, 1);
						}
					}
				}
			}
			fs.writeFileSync("database.json", JSON.stringify(parsedDatabase, null, 2), "utf-8");
		} catch (error) {
			console.error(error);
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

export const on_kick = (client: Client): void => {
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