import {Client} from "discord.js";
import fs from "fs";

export default (client	: Client): void => {
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