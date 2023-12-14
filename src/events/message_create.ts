import {ChannelType, Client, ForumChannel, TextChannel, ThreadChannel, userMention} from "discord.js";
import { deleteAfter } from "../commands";
import { Parser } from "@dice-roller/rpg-dice-roller";
import en from "../locales/en";
import fr from "../locales/fr";
import { COMMENT_REGEX, parseResult, roll } from "../dice";
import moment from "moment";
import { findForumChannel, findThread } from "../utils";
const TRANSLATION = {
	fr,
	en
}
export default (client: Client): void => {
	client.on("messageCreate", async (message) => {
		if (message.author.bot) return;
		if (message.channel.type === ChannelType.DM) return;
		if (!message.guild) return;
		let content = message.content;
		//detect roll between bracket
		const detectRoll = content.match(/\[(.*)\]/)?.[1]
		let deleteInput=true;
		try {
			if (detectRoll) roll(detectRoll);
			else roll(content);
		} catch(e) {
			return;
		}
		if (detectRoll) {
			content = detectRoll;
			deleteInput = false;
		}
		//is a valid roll as we are in the function so we can work as always
		const userLang = message.guild.preferredLocale ?? "en"
		const translation = TRANSLATION[userLang as keyof typeof TRANSLATION] || TRANSLATION.en;
		const channel = message.channel;
		const dice = roll(content);
		const parser = parseResult(dice);
		if (channel instanceof TextChannel || channel.parent instanceof ForumChannel) {
			let linkToOriginal = "";
			if (deleteInput) {
				message.delete()
			} else {
				linkToOriginal = `\n\n__Original__: ${message.url}`;
			}
			const thread = channel instanceof TextChannel ? await findThread(channel, translation.roll.reason) : await findForumChannel(channel.parent as ForumChannel, translation.roll.reason);
			const msgToEdit = await thread.send("_ _");
			const authorMention = `*${userMention(message.author.id)}* (🎲 \`${dice.dice.replace(COMMENT_REGEX, "")}\`)`;
			const msg = `${authorMention} - <t:${moment().unix()}>\n${parser}${linkToOriginal}`;
			await msgToEdit.edit(msg);
			const idMessage = `↪ ${msgToEdit.url}`;
			const reply = deleteInput ? await channel.send({ content: `${authorMention}\n${parser}\n\n${idMessage}` }) : await message.reply({ content: `${parser}\n\n${idMessage}` });
			deleteAfter(reply, 180000)
			return;
		}
		await message.reply({content: parser});
	})
}