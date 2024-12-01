import type { GuildData, PersonnageIds } from "@interfaces/database";
import { logger } from "@logger";
import type { EClient } from "@main";

import { sendLogs } from "@utils";
import type { AnyThreadChannel } from "discord.js";
import type * as Djs from "discord.js";
import type Enmap from "enmap";
export const DELETE_CHANNEL = (client: EClient): void => {
	client.on("channelDelete", async (channel) => {
		try {
			if (channel.isDMBased()) return;
			const guildID = channel.guild.id;
			const db = client.settings;
			deleteIfChannelOrThread(db, guildID, channel);
		} catch (error) {
			logger.error(error);
			if (channel.isDMBased()) return;
			await sendLogs((error as Error).message, channel.guild, client.settings);
		}
	});
};

function deleteIfChannelOrThread(
	db: Enmap<string, GuildData, unknown>,
	guildID: string,
	channel: Djs.NonThreadGuildBasedChannel | AnyThreadChannel
) {
	const channelID = channel.id;
	cleanUserDB(db, channel);
	if (db.get(guildID, "templateID.channelId") === channelID)
		db.delete(guildID, "templateID");
	if (db.get(guildID, "logs") === channelID) db.delete(guildID, "logs");
	if (db.get(guildID, "managerId") === channelID) db.delete(guildID, "managerId");
	if (db.get(guildID, "privateChannel") === channelID)
		db.delete(guildID, "privateChannel");
	if (db.get(guildID, "rollChannel") === channelID) db.delete(guildID, "rollChannel");
}

export const DELETE_THREAD = (client: EClient): void => {
	client.on("threadDelete", async (thread) => {
		try {
			//search channelID in database and delete it
			const guildID = thread.guild.id;
			const db = client.settings;
			//verify if the user message was in the thread
			deleteIfChannelOrThread(db, guildID, thread);
		} catch (error) {
			logger.error(error);
			if (thread.isDMBased()) return;
			await sendLogs((error as Error).message, thread.guild, client.settings);
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
			const channel = message.channel;
			if (channel.isDMBased()) return;
			if (client.settings.get(guildID, "templateID.messageId") === messageId)
				client.settings.delete(guildID, "templateID");

			const dbUser = client.settings.get(guildID, "user");
			if (dbUser && Object.keys(dbUser).length > 0) {
				for (const [user, values] of Object.entries(dbUser)) {
					for (const [index, value] of values.entries()) {
						const persoId: PersonnageIds = {
							messageId: value.messageId[0],
							channelId: value.messageId[1],
						};
						if (persoId.messageId === messageId && persoId.channelId === channel.id) {
							logger.silly(`Deleted character ${value.charName} for user ${user}`);
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
			logger.error(error);
		}
	});
};

function cleanUserDB(
	guildDB: Enmap<string, GuildData, unknown>,
	thread: Djs.GuildTextBasedChannel | Djs.ThreadChannel | Djs.NonThreadGuildBasedChannel
) {
	const dbUser = guildDB.get(thread.guild.id, "user");
	if (!dbUser) return;
	if (!thread.isTextBased()) return;
	/** if private channel was deleted, delete only the private charactersheet */

	for (const [user, data] of Object.entries(dbUser)) {
		const filterChar = data.filter((char) => {
			return char.messageId[1] !== thread.id;
		});
		logger.silly(
			`Deleted ${data.length - filterChar.length} characters for user ${user}`
		);
		if (filterChar.length === 0) guildDB.delete(thread.guild.id, `user.${user}`);
		else guildDB.set(thread.guild.id, filterChar, `user.${user}`);
	}
}

export function deleteUser(
	interaction: Djs.CommandInteraction | Djs.ModalSubmitInteraction,
	guildData: GuildData,
	user?: Djs.User | null,
	charName?: string | null
) {
	//delete the character from the database
	const userCharIndex = guildData.user[user?.id ?? interaction.user.id].findIndex(
		(char) => {
			return char.charName?.standardize() === charName?.standardize();
		}
	);
	if (userCharIndex === -1) {
		return guildData;
	}
	guildData.user[user?.id ?? interaction.user.id].splice(userCharIndex, 1);
	return guildData;
}
