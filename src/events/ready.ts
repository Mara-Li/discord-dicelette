import { commandsList } from "@commands";
import { log, success } from "@console";
import type { GuildData } from "@interface";
import { type EClient, VERSION } from "@main";
import { ActivityType, REST, Routes } from "discord.js";
import dotenv from "dotenv";
import * as fs from "node:fs";
import process from "node:process";



dotenv.config({ path: ".env" });

const rest = new REST().setToken(process.env.DISCORD_TOKEN ?? "0");

export default (client: EClient): void => {
	client.on("ready", async () => {
		if (!client.user || !client.application || !process.env.CLIENT_ID) {
			return;
		}
		success(`${client.user.username} is online; v.${VERSION}`);
		const serializedCommands = commandsList.map(command => command.data.toJSON());
		const wasconverted = convertJSONToEnmap(client);
		client.user.setActivity("Roll Dices 🎲 !", { type: ActivityType.Competing });
		for (const guild of client.guilds.cache.values()) {
			log(`Registering commands for ${guild.name}`);

			// biome-ignore lint/complexity/noForEach: forEach is fine here
			guild.client.application.commands.cache.forEach((command) => {
				log(`Deleting ${command.name}`);
				command.delete();
			});

			await rest.put(
				Routes.applicationGuildCommands(process.env.CLIENT_ID, guild.id),
				{ body: serializedCommands },
			);
			if (wasconverted) {
				try {
					const owner = await guild.members.fetch(guild.ownerId);
					if (owner) {
						owner.send(`[MESSAGE FOR SERVER: ${guild.name}]\nThe database of Dicelette was updated into a new more secure format!\nNormally, all your data should be working but if you notice any missing data, please contact the bot owner! All old data was moved to a backup file, so don't worry!\n\nHave a nice day :)`);
					}
				} catch (e) {
					//skip
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