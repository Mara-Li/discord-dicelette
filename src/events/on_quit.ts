import { Client } from "discord.js";
import fs from "fs";

export default (client: Client): void => {
	client.on("guildDelete", async (guild) => {
		//delete guild from database
		const guildID = guild.id;
		const data = fs.readFileSync("database.json", "utf-8");
		const json = JSON.parse(data);
		if (json[guildID]) delete json[guildID];
		fs.writeFileSync("database.json", JSON.stringify(json, null, 2));
	});
};