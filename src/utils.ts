import { ForumChannel, TextChannel } from "discord.js";
import moment from "moment";

export async function findThread(channel: TextChannel, reason?: string) {
	const mostRecentThread = channel.threads.cache.sort((a, b) => {
		const aDate = a.createdTimestamp;
		const bDate = b.createdTimestamp;
		if (aDate && bDate) {
			return bDate - aDate;
		}
		return 0;
	});
	const thread = mostRecentThread.find(thread => thread.name.startsWith("🎲") && !thread.archived);
	if (thread) {
		const threadThatMustBeArchived = mostRecentThread.filter(tr => tr.name.startsWith("🎲") && !tr.archived && tr.id !== thread.id);
		for (const thread of threadThatMustBeArchived) {
			await thread[1].setArchived(true);
		}
		return thread;
	}
	//create thread
	const date = moment().format("YYYY-MM-DD:HH:mm");
	return await channel.threads.create({
		name: `🎲 ${date}`,
		reason,
	});
}

export async function findForumChannel(forum: ForumChannel, reason: string, topic :string) {
	const allForumChannel = forum.threads.cache.sort((a, b) => {
		const aDate = a.createdTimestamp;
		const bDate = b.createdTimestamp;
		if (aDate && bDate) {
			return bDate - aDate;
		}
		return 0;
	})
	const rollTopic = allForumChannel.find(thread => thread.name === `🎲 ${topic}` && !thread.archived)
	if (rollTopic) {
		//archive all other roll topic
		const threadThatMustBeArchived = allForumChannel.filter(tr => tr.name === `🎲 ${topic}` && !tr.archived && tr.id !== rollTopic.id);
		for (const topic of threadThatMustBeArchived) {
			await topic[1].setArchived(true);
		}
		return rollTopic
	}
	//create new forum thread
	return await forum.threads.create({
		name: `🎲 ${topic}`,
		message: {content: reason},

	});

}


export async function setTagsForRoll(forum: ForumChannel) {
	//check if the tags `🪡 roll logs` exists
	const allTags = forum.
}