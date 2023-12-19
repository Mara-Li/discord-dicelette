import { ForumChannel, GuildForumTagData, TextChannel, ThreadChannel } from "discord.js";


export async function findThread(channel: TextChannel, reason?: string) {
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
	return await channel.threads.create({
		name: threadName,
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