import { commandsList } from "@commands";
import { log, success, warn } from "@console";
import type { Settings } from "@interface";
import { type EClient, VERSION } from "@main";
import { ActivityType, type Guild, REST, Routes } from "discord.js";
import dotenv from "dotenv";
import process from "node:process";

dotenv.config({ path: ".env" });

const rest = new REST().setToken(process.env.DISCORD_TOKEN ?? "0");

export default (client: EClient): void => {
	client.on("ready", async () => {
		if (!client.user || !client.application || !process.env.CLIENT_ID) {
			return;
		}
		success(`${client.user.username} is online; v.${VERSION}`);
		const serializedCommands = commandsList.map((command) => command.data.toJSON());
		client.user.setActivity("Roll Dices 🎲 !", { type: ActivityType.Competing });
		for (const guild of client.guilds.cache.values()) {
			log(`Registering commands for ${guild.name}`);

			// biome-ignore lint/complexity/noForEach: forEach is fine here
			guild.client.application.commands.cache.forEach((command) => {
				log(`Deleting ${command.name}`);
				command.delete();
			});

			await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, guild.id), {
				body: serializedCommands,
			});

			convertDatabaseUser(client.settings, guild);
		}
		cleanData(client);
	});
};

function convertDatabaseUser(db: Settings, guild: Guild) {
	if (db.get(guild.id, "converted")) return;
	const users = db.get(guild.id, "user");
	if (!users) {
		db.set(guild.id, true, "converted");
		return;
	}
	const defaultChannel = db.get(guild.id, "managerId");
	const privateChannel = db.get(guild.id, "privateChannel");
	for (const [userId, userData] of Object.entries(users)) {
		for (const index in userData) {
			const data = userData[index];
			if (!Array.isArray(data.messageId)) {
				warn(`Converting ${userId} => ${JSON.stringify(userData)} in ${guild.name}`);
				let toUpdate = false;
				if (data.isPrivate && privateChannel) {
					data.messageId = [data.messageId, privateChannel];
					toUpdate = true;
				} else if (defaultChannel) {
					toUpdate = true;
					data.messageId = [data.messageId, defaultChannel];
				}
				if (toUpdate) db.set(guild.id, data, `user.${userId}.${index}`);
				else {
					console.warn(
						`No channel to update for ${userId}/${data.charName} => Deleting it`
					);
					db.delete(guild.id, `user.${userId}.${index}`);
				}
			}
		}
		if (userData.length === 0) db.delete(guild.id, `user.${userId}`);
	}
	db.set(guild.id, true, "converted");
}

function cleanData(client: EClient) {
	const guilds = client.guilds.cache;
	const settings = client.settings;
	for (const [guildId] of settings.entries()) {
		if (!guilds.has(guildId)) {
			warn(`Removing ${guildId} from the database as the bot is not in it anymore`);
			client.settings.delete(guildId);
		}
	}
}
