import { GuildData } from "@interface";
import { setTagsForRoll } from "@utils";
import { ForumChannel, TextChannel, ThreadChannel } from "discord.js";
import Enmap from "enmap";
/**
 * Find a thread by their data or create it
 * @param channel {TextChannel}
 * @param reason {string}
 */
export async function findThread(db: Enmap<string, GuildData, unknown>, channel: TextChannel, reason?: string) {
	const guild = channel.guild.id;
	const rollChannelId = db.get(guild, "rollChannel");
	if (rollChannelId) {
		const rollChannel = await channel.guild.channels.fetch(rollChannelId);
		if (rollChannel instanceof ThreadChannel || rollChannel instanceof TextChannel) {
			return rollChannel;
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
	const threadName = `🎲 ${ channel.name.replaceAll("-", " ")}`;
	const thread = mostRecentThread.find(thread => thread.name.startsWith("🎲") && !thread.archived);
	if (thread) {
		const threadThatMustBeArchived = mostRecentThread.filter(tr => tr.name.startsWith("🎲") && !tr.archived && tr.id !== thread.id);
		for (const thread of threadThatMustBeArchived) {
			await thread[1].setArchived(true);
		}
		return thread;
	} else if (mostRecentThread.find(thread => thread.name === threadName && thread.archived)){
		const thread = mostRecentThread.find(thread => thread.name === threadName && thread.archived);
		if (thread) {
			thread.setArchived(false);
			return thread;
		}
	}
	//create thread
	const newThread = await channel.threads.create({
		name: threadName,
		reason,
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
export async function findForumChannel(forum: ForumChannel, reason: string, thread: ThreadChannel | TextChannel, db: Enmap<string, GuildData, unknown>) {
	const guild = forum.guild.id;
	const rollChannelId = db.get(guild, "rollChannel");
	if (rollChannelId) {
		const rollChannel = await forum.guild.channels.fetch(rollChannelId);
		if (rollChannel instanceof ThreadChannel || rollChannel instanceof TextChannel) {
			return rollChannel;
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
	const rollTopic = allForumChannel.find(thread => thread.name === `🎲 ${topic}`);
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
		message: {content: reason},
		appliedTags: [tags.id as string],
	});
}

