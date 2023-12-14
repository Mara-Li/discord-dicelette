import { TextChannel } from "discord.js";
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
