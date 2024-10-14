import {EClient, logger} from "@main";
import * as Djs from "discord.js";

export default (client: EClient): void =>{
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
	});
}

async function sendRollToDM(reaction: Djs.MessageReaction | Djs.PartialMessageReaction) {
	const message = reaction.message;
	if (!message || !message.content) return;
	const user = reaction.users.cache.last();
	if (!user || user.bot) return;
	await user.send({ content: message.content });
}

async function copyReaction(reaction: Djs.MessageReaction) {
	if (!reaction.message.content) return;
	const message = reaction.message.content;
	if (!message.subText(`-# ↪ https://discord.com/channels/${reaction.message.guild!.id}`)) return;
	const regexChannel = new RegExp(`https:\\/\\/discord.com\\/channels\\/${reaction.message!.guild!.id}\\/(?<channelID>\\d+)\\/(?<messageID>\\d+)\\/?`, "gi");
}
