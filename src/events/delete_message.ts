import {Client} from "discord.js";
import fs from "fs";
import { GuildData } from "../interface";

export default (client	: Client): void => {
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
			if (dbUser) {
				for (const values of Object.values(dbUser)) {
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