import { error as err } from "@console";
import type { GuildData } from "@interface";
import type { EClient } from "@main";
import { isStatsThread, sendLogs } from "@utils";
import { type CommandInteraction, type GuildTextBasedChannel, type NonThreadGuildBasedChannel, TextChannel, type ThreadChannel, type User } from "discord.js";
import type Enmap from "enmap";
import removeAccents from "remove-accents";

export const DELETE_CHANNEL = (client: EClient): void => {
	client.on("channelDelete", async (channel) => {
		try {
			if (channel.isDMBased()) return;
			const channelID = channel.id;
			//search channelID in database and delete it
			const guildID = channel.guild.id;
			const db = client.settings;
			if (db.get(guildID, "templateID.channelId") === channelID) db.delete(guildID, "templateID");
			if (db.get(guildID, "logs") === channelID) db.delete(guildID, "logs");
			if (db.get(guildID, "managerId") === channelID) db.delete(guildID, "managerId");
			if (db.get(guildID, "privateChannel") === channelID) db.delete(guildID, "privateChannel");
			if (db.get(guildID, "rollChannel") === channelID) db.delete(guildID, "rollChannel");

		} catch (error) {
			err(error);
			if (channel.isDMBased()) return;
			sendLogs((error as Error).message, channel.guild, client.settings);
		}

	});
};

export const DELETE_THREAD = (client: EClient): void => {
	client.on("threadDelete", async (thread) => {
		try {
			//search channelID in database and delete it
			const guildID = thread.guild.id;
			const db = client.settings;
			if (isStatsThread(client.settings, guildID, thread) || thread.id === db.get(guildID, "managerId") || thread.id === db.get(guildID, "privateChannel")) {
				//verify if the user message was in the thread
				cleanUserDB(db, thread);
			}
			if (db.get(guildID, "logs") === thread.id) db.delete(guildID, "logs");
			if (db.get(guildID, "template.channelId") === thread.id) db.delete(guildID, "template");
		} catch (error) {
			err(error);
			if (thread.isDMBased()) return;
			sendLogs((error as Error).message, thread.guild, client.settings);
		}
	});
};

export const DELETE_MESSAGE = (client: EClient): void => {
	client.on("messageDelete", async (message) => {
		try {
			if (!message.guild) return;
			const messageId = message.id;
			//search channelID in database and delete it
			const guildID = message.guild.id;
			console.log(message.channel.id, message.thread?.id);
			const channel = message.channel;
			if (channel.isDMBased()) return;
			if (client.settings.get(guildID, "templateID.messageId") === messageId) client.settings.delete(guildID, "templateID");

			const dbUser = client.settings.get(guildID, "user");
			if (dbUser && Object.keys(dbUser).length > 0) {
				for (const [user, values] of Object.entries(dbUser)) {
					for (const [index, value] of values.entries()) {
						if (value.messageId === messageId) {
							values.splice(index, 1);
						}
					}
					if (values.length === 0) delete dbUser[user];
				}
			}
			client.settings.set(guildID, dbUser, "user");
		} catch (error) {
			if (!message.guild) return;
			sendLogs((error as Error).message, message.guild, client.settings);
		}
	});
};

export const ON_KICK = (client: EClient): void => {
	client.on("guildDelete", async (guild) => {
		//delete guild from database
		try {
			client.settings.delete(guild.id);
		} catch (error) {
			err(error);
		}
	});
};

function cleanUserDB(guildDB: Enmap<string, GuildData, unknown>, thread: GuildTextBasedChannel | ThreadChannel | NonThreadGuildBasedChannel) {
	const dbUser = guildDB.get(thread.guild.id, "user");
	if (!dbUser) return;
	if (!(thread instanceof TextChannel)) return;
	/** if private channel was deleted, delete only the private charactersheet */
	const privateEnabled = guildDB.get(thread.guild.id, "privateChannel");
	const isPrivate = privateEnabled === thread.id;
	if (privateEnabled) {
		for (const [user, data] of Object.entries(dbUser)) {
			const filterChar = isPrivate ? data.filter(char => !char.isPrivate) : data.filter(char => char.isPrivate);
			guildDB.set(thread.guild.id, filterChar, `user.${user}`);
		}
	} else {
		guildDB.delete(thread.guild.id, "user");
	}
}

export function deleteUser(
	interaction: CommandInteraction,
	guildData: GuildData,
	user?: User | null,
	charName?: string,
) {
	//delete the character from the database
	const userCharIndex = guildData.user[user?.id ?? interaction.user.id].findIndex((char) => {
		if (char.charName && charName) return removeAccents(char.charName).toLowerCase() === removeAccents(charName).toLowerCase();
		return (charName == null && char.charName == null);
	});
	if (userCharIndex === -1) {
		return guildData;
	}
	guildData.user[user?.id ?? interaction.user.id].splice(userCharIndex, 1);
	return guildData;
}