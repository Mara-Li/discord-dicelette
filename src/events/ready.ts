import { REST, Routes } from "discord.js";
import dotenv from "dotenv";
import * as fs from "fs";
import process from "process";

import { commandsList } from "../commands";
import { EClient , VERSION } from "../index";



dotenv.config({ path: ".env" });

const rest = new REST().setToken(process.env.DISCORD_TOKEN ?? "0");

export default (client: EClient): void => {
	client.on("ready", async () => {
		if (!client.user || !client.application || !process.env.CLIENT_ID) {
			return;
		}
		console.info(`${client.user.username} is online; v.${VERSION}`);
		const serializedCommands = commandsList.map(command => command.data.toJSON());
		convertJSONToEnmap(client);
		for (const guild of client.guilds.cache.values()) {
			console.log(`Registering commands for ${guild.name}`);
			guild.client.application.commands.cache.forEach((command) => {
				console.log(`Deleting ${command.name}`);
				command.delete();
			});
			await rest.put(
				Routes.applicationGuildCommands(process.env.CLIENT_ID, guild.id),
				{ body: serializedCommands },
			);
		}

	});
};

function convertJSONToEnmap(Client: EClient) {
	if (!fs.existsSync("database.json")) {
		return;
	}
	const data = fs.readFileSync("database.json", "utf8");
	const parsedData = JSON.parse(data);
	for (const key in parsedData) {
		Client.settings.set(key, parsedData[key]);
	}
	//delete the file
	//fs.unlinkSync("database.json");
	//print Enmap
	//console.log(Client.settings);
	
}