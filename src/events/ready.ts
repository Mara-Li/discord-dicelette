import { commandsList } from "@commands";
import { GuildData } from "@interface";
import { EClient , VERSION } from "@main";
import { REST, Routes } from "discord.js";
import dotenv from "dotenv";
import * as fs from "fs";
import process from "process";



dotenv.config({ path: ".env" });

const rest = new REST().setToken(process.env.DISCORD_TOKEN ?? "0");

export default (client: EClient): void => {
	client.on("ready", async () => {
		if (!client.user || !client.application || !process.env.CLIENT_ID) {
			return;
		}
		console.info(`${client.user.username} is online; v.${VERSION}`);
		const serializedCommands = commandsList.map(command => command.data.toJSON());
		const wasconverted = convertJSONToEnmap(client);
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
			if (wasconverted) {
				//send a message to the owner of the guild
				const owner = await guild.members.fetch(guild.ownerId);
				if (owner) {
					owner.send("The database of this bot was updated into a new more secure format!\n Normally, all your data should be working but if you notice any data missing, please contact the bot owner! All old data was moved to a backup file, so don't worry!\n\nHave a nice day :)");
				}
			}
		}

	});
};

function convertJSONToEnmap(Client: EClient) {
	if (!fs.existsSync("database.json")) {
		return false;
	}
	const data = fs.readFileSync("database.json", "utf8");
	const parsedData = JSON.parse(data) as { [key: string]: GuildData };
	for (const [guildId, guildData] of Object.entries(parsedData)) {
		Client.settings.set(guildId, guildData);
	}
	//move the file to a backup
	fs.renameSync("database.json", `database_${Date.now()}.json`);
	return true;
}