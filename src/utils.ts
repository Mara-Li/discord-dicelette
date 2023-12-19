import { ForumChannel, GuildForumTagData, TextChannel, ThreadChannel } from "discord.js";
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
	const date = "[" + moment().format("YYYY-MM-DD") + "] " + moment().format("HH:mm");
	return await channel.threads.create({
		name: `🎲 ${date}`,
		reason,
	});
}

export async function findForumChannel(forum: ForumChannel, reason: string, thread: ThreadChannel | TextChannel) {
	const allForumChannel = forum.threads.cache.sort((a, b) => {
		const aDate = a.createdTimestamp;
		const bDate = b.createdTimestamp;
		if (aDate && bDate) {
			return bDate - aDate;
		}
		return 0;
	});
	const topic = thread.name;
	const rollTopic = allForumChannel.find(thread => thread.name === `🎲 ${topic}` && !thread.archived);
	const tags = await setTagsForRoll(forum);
	if (rollTopic) {
		//archive all other roll topic
		const threadThatMustBeArchived = allForumChannel.filter(tr => tr.name === `🎲 ${topic}` && !tr.archived && tr.id !== rollTopic.id);
		for (const topic of threadThatMustBeArchived) {
			await topic[1].setArchived(true);
		}
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


export async function setTagsForRoll(forum: ForumChannel) {
	//check if the tags `🪡 roll logs` exists
	const allTags = forum.availableTags;
	const diceRollTag = allTags.find(tag => tag.name === "Dice Roll" && tag.emoji?.name === "🪡");
	if (diceRollTag) {
		return diceRollTag;
	}
	const availableTags: GuildForumTagData[] = allTags.map(tag => {
		return {
			id: tag.id,
			moderated: tag.moderated,
			name: tag.name,
			emoji: tag.emoji,
		};
	});
	availableTags.push({
		name: "Dice Roll",
		emoji: {id: null, name: "🪡"},
	});
	await forum.setAvailableTags(availableTags);
	return availableTags.find(tag => tag.name === "Dice Roll" && tag.emoji?.name === "🪡") as GuildForumTagData;
}