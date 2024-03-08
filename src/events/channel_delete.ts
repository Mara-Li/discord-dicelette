import {Client} from "discord.js";
import fs from "fs";

import { GuildData } from "../interface";

export const channel_delete = (client	: Client): void => {
	client.on("channelDelete", async (channel) => {
		try {
			if (channel.isDMBased()) return;
			const channelID = channel.id;
			//search channelID in database and delete it
			const guildID = channel.guild.id;
			const database = fs.readFileSync("database.json", "utf-8");
			const parsedDatabase = JSON.parse(database);
			if (!parsedDatabase[guildID]) return;
			if (parsedDatabase[guildID].templateID.channelID === channelID) {
				delete parsedDatabase[guildID].templateID;
			}
			fs.writeFileSync("database.json", JSON.stringify(parsedDatabase, null, 2), "utf-8");
		} catch (error) {
			console.error(error);
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
		}
	});
};

export const on_kick = (client: Client): void => {
	client.on("guildDelete", async (guild) => {
		//delete guild from database
		const guildID = guild.id;
		const data = fs.readFileSync("database.json", "utf-8");
		const json = JSON.parse(data);
		if (json[guildID]) delete json[guildID];
		fs.writeFileSync("database.json", JSON.stringify(json, null, 2));
	});
};