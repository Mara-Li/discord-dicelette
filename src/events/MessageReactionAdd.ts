import { type EClient, logger } from "@main";
import * as Djs from "discord.js";

export default (client: EClient): void => {
	client.on("messageReactionAdd", async (reaction, user) => {
		if (reaction.partial) {
			try {
				await reaction.fetch();
			} catch (error) {
				logger.error("Something went wrong when fetching the message: ", error);
				return;
			}
		}
		if (!reaction.message.guild) return;
		if (reaction.message.author?.id !== client.user?.id) return;
		//two behavior here
		//1. Send the result to the user in DM
		//2. Copy the reaction to the saved message ONLY if the message contains the link to the saved message
		if (reaction.emoji.id === "✉️") {
			await sendRollToDM(reaction);
			return;
		}
		await copyReaction(reaction);
	});
};

async function sendRollToDM(reaction: Djs.MessageReaction | Djs.PartialMessageReaction) {
	const message = reaction.message;
	if (!message || !message.content) return;
	const user = reaction.users.cache.last();
	if (!user || user.bot) return;
	await user.send({ content: message.content });
}

async function copyReaction(reaction: Djs.MessageReaction | Djs.PartialMessageReaction) {
	if (!reaction.message.content) return;
	const guild = reaction.message.guild as Djs.Guild;
	const message = reaction.message.content;
	const regexChannel = new RegExp(
		`-# ↪ https:\\/\\/discord.com\\/channels\\/${reaction.message!.guild!.id}\\/(?<channelID>\\d+)\\/(?<messageID>\\d+)\\/?`,
		"gi"
	);
	const match = regexChannel.exec(message);
	if (!match || !match.groups) return;
	const channelID = match.groups.channelID;
	const messageID = match.groups.messageID;
	const channel = await guild.channels.fetch(channelID);
	if (!channel || !channel.isTextBased || channel instanceof Djs.CategoryChannel) return;
	const messageToCopy = await channel.messages.fetch(messageID);
	if (!messageToCopy) return;
	await messageToCopy.react(reaction.emoji);
}
