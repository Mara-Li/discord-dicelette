import type {
	CharDataWithName,
	CharacterData,
	PersonnageIds,
} from "@interfaces/database";
import type { DiscordTextChannel, Settings, Translation } from "@interfaces/discord";
import { type EClient, logger } from "@main";
import {
	embedError,
	haveAccess,
	reply,
	searchUserChannel,
	sendLogs,
	setTagsForRoll,
} from "@utils";
import * as Djs from "discord.js";

export async function isUserNameOrId(
	userId: string,
	interaction: Djs.ModalSubmitInteraction
) {
	if (!userId.match(/\d+/))
		return (await interaction.guild!.members.fetch({ query: userId })).first();
	return await interaction.guild!.members.fetch({ user: userId });
}

export async function findMessageBefore(
	channel: DiscordTextChannel,
	inter: Djs.Message | Djs.InteractionResponse,
	client: Djs.Client
) {
	let messagesBefore = await channel.messages.fetch({ before: inter.id, limit: 1 });
	let messageBefore = messagesBefore.first();
	while (messageBefore && messageBefore.author.username === client.user?.username) {
		messagesBefore = await channel.messages.fetch({
			before: messageBefore.id,
			limit: 1,
		});
		messageBefore = messagesBefore.first();
	}
	return messageBefore;
}

export async function findLocation(
	userData: CharacterData,
	interaction: Djs.CommandInteraction,
	client: EClient,
	ul: Translation,
	charData: CharDataWithName,
	user?: Djs.User | null
): Promise<{
	thread?:
		| Djs.PrivateThreadChannel
		| Djs.TextChannel
		| Djs.NewsChannel
		| Djs.PublicThreadChannel<boolean>;
	sheetLocation: PersonnageIds;
}> {
	const sheetLocation: PersonnageIds = {
		channelId: userData.messageId[1],
		messageId: userData.messageId[0],
	};
	const thread = await searchUserChannel(
		client.settings,
		interaction,
		ul,
		sheetLocation?.channelId
	);
	if (!thread) {
		await reply(interaction, { embeds: [embedError(ul("error.noThread"), ul)] });
		return { sheetLocation };
	}
	const allowHidden = haveAccess(interaction, thread.id, user?.id ?? interaction.user.id);
	if (!allowHidden && charData[user?.id ?? interaction.user.id]?.isPrivate) {
		await reply(interaction, { embeds: [embedError(ul("error.private"), ul)] });
		return { sheetLocation };
	}
	return { thread, sheetLocation };
}

/**
 * Find a thread by their data or create it for roll
 */
export async function findThread(
	db: Settings,
	channel: Djs.TextChannel,
	ul: Translation,
	hidden?: string
) {
	const guild = channel.guild.id;
	const rollChannelId = !hidden ? db.get(guild, "rollChannel") : hidden;
	if (rollChannelId) {
		try {
			const rollChannel = await channel.guild.channels.fetch(rollChannelId);
			// noinspection SuspiciousTypeOfGuard
			if (
				rollChannel instanceof Djs.ThreadChannel ||
				rollChannel instanceof Djs.TextChannel
			) {
				return rollChannel;
			}
		} catch (e) {
			let command = `${ul("config.name")} ${ul("changeThread.name")}`;

			if (hidden) {
				db.delete(guild, "hiddenRoll");
				command = `${ul("config.name")} ${ul("hidden.title")}`;
			} else db.delete(guild, "rollChannel");
			await sendLogs(ul("error.rollChannelNotFound", { command }), channel.guild, db);
		}
	}
	await channel.threads.fetch();
	await channel.threads.fetchArchived();
	const mostRecentThread = channel.threads.cache.sort((a, b) => {
		const aDate = a.createdTimestamp;
		const bDate = b.createdTimestamp;
		if (aDate && bDate) {
			return bDate - aDate;
		}
		return 0;
	});
	const threadName = `🎲 ${channel.name.replaceAll("-", " ")}`;
	const thread = mostRecentThread.find(
		(thread) => thread.name.startsWith("🎲") && !thread.archived
	);
	if (thread) {
		const threadThatMustBeArchived = mostRecentThread.filter(
			(tr) => tr.name.startsWith("🎲") && !tr.archived && tr.id !== thread.id
		);
		for (const thread of threadThatMustBeArchived) {
			await thread[1].setArchived(true);
		}
		return thread;
	}
	if (mostRecentThread.find((thread) => thread.name === threadName && thread.archived)) {
		const thread = mostRecentThread.find(
			(thread) => thread.name === threadName && thread.archived
		);
		if (thread) {
			await thread.setArchived(false);
			return thread;
		}
	}
	//create thread
	const newThread = await channel.threads.create({
		name: threadName,
		reason: ul("roll.reason"),
	});
	//delete the message about thread creation
	await channel.lastMessage?.delete();
	return newThread;
}

/**
 * Find a forum channel already existing or creat it
 */
export async function findForumChannel(
	forum: Djs.ForumChannel,
	thread: Djs.ThreadChannel | Djs.TextChannel,
	db: Settings,
	ul: Translation,
	hidden?: string
) {
	const guild = forum.guild.id;
	const rollChannelId = !hidden ? db.get(guild, "rollChannel") : hidden;
	if (rollChannelId) {
		try {
			const rollChannel = await forum.guild.channels.fetch(rollChannelId);
			if (
				rollChannel instanceof Djs.ThreadChannel ||
				rollChannel instanceof Djs.TextChannel
			) {
				return rollChannel;
			}
		} catch (e) {
			let command = `${ul("config.name")} ${ul("changeThread.name")}`;

			if (hidden) {
				db.delete(guild, "hiddenRoll");
				command = `${ul("config.name")} ${ul("hidden.title")}`;
			} else db.delete(guild, "rollChannel");
			await sendLogs(ul("error.rollChannelNotFound", { command }), forum.guild, db);
		}
	}
	const allForumChannel = forum.threads.cache.sort((a, b) => {
		const aDate = a.createdTimestamp;
		const bDate = b.createdTimestamp;
		if (aDate && bDate) {
			return bDate - aDate;
		}
		return 0;
	});
	const topic = thread.name;
	const rollTopic = allForumChannel.find((thread) => thread.name === `🎲 ${topic}`);
	const tags = await setTagsForRoll(forum);
	if (rollTopic) {
		//archive all other roll topic
		if (rollTopic.archived) rollTopic.setArchived(false);
		await rollTopic.setAppliedTags([tags.id as string]);
		return rollTopic;
	}
	//create new forum thread
	return await forum.threads.create({
		name: `🎲 ${topic}`,
		message: { content: ul("roll.reason") },
		appliedTags: [tags.id as string],
	});
}

export async function findChara(charData: CharDataWithName, charName?: string) {
	logger.silly(charData, charName);
	return Object.values(charData).find((data) => {
		if (data.charName && charName) {
			return data.charName.subText(charName);
		}
		return data.charName === charName;
	});
}
