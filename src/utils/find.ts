import type { DiscordTextChannel, Settings, Translation } from "@interface";
import { sendLogs, setTagsForRoll } from "@utils";
import {
	type Client,
	type ForumChannel,
	type InteractionResponse,
	type Message,
	type ModalSubmitInteraction,
	TextChannel,
	ThreadChannel,
} from "discord.js";

export async function isUserNameOrId(
	userId: string,
	interaction: ModalSubmitInteraction
) {
	if (!userId.match(/\d+/))
		return (await interaction.guild!.members.fetch({ query: userId })).first();
	return await interaction.guild!.members.fetch({ user: userId });
}

export async function findMessageBefore(
	channel: DiscordTextChannel,
	inter: Message | InteractionResponse,
	client: Client
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

/**
 * Find a thread by their data or create it for roll
 * @param channel {TextChannel}
 * @param reason {string}
 */
export async function findThread(db: Settings, channel: TextChannel, ul: Translation) {
	const guild = channel.guild.id;
	const rollChannelId = db.get(guild, "rollChannel");
	if (rollChannelId) {
		try {
			const rollChannel = await channel.guild.channels.fetch(rollChannelId);
			if (rollChannel instanceof ThreadChannel || rollChannel instanceof TextChannel) {
				return rollChannel;
			}
		} catch (e) {
			db.delete(guild, "rollChannel");
			sendLogs(ul("error.rollChannelNotFound"), channel.guild, db);
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
			thread.setArchived(false);
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
 * @param forum {ForumChannel}
 * @param reason {string}
 * @param thread {ThreadChannel | TextChannel}
 * @returns
 */
export async function findForumChannel(
	forum: ForumChannel,
	thread: ThreadChannel | TextChannel,
	db: Settings,
	ul: Translation
) {
	const guild = forum.guild.id;
	const rollChannelId = db.get(guild, "rollChannel");
	if (rollChannelId) {
		try {
			const rollChannel = await forum.guild.channels.fetch(rollChannelId);
			if (rollChannel instanceof ThreadChannel || rollChannel instanceof TextChannel) {
				return rollChannel;
			}
		} catch (e) {
			db.delete(guild, "rollChannel");
			sendLogs(ul("error.rollChannelNotFound"), forum.guild, db);
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
		rollTopic.setAppliedTags([tags.id as string]);
		return rollTopic;
	}
	//create new forum thread
	return await forum.threads.create({
		name: `🎲 ${topic}`,
		message: { content: ul("roll.reason") },
		appliedTags: [tags.id as string],
	});
}
