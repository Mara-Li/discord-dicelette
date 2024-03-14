/* eslint-disable no-useless-escape */
import {ChannelType, Client, ForumChannel, Locale, TextChannel, ThreadChannel, userMention} from "discord.js";
import moment from "moment";

import { deleteAfter } from "../commands/base";
import { COMMENT_REGEX, parseResult, roll } from "../dice";
import { Resultat } from "../interface";
import { ln } from "../localizations";
import { findForumChannel, findThread } from "../utils/find";


// eslint-disable-next-line no-useless-escape
export const DETECT_DICE_MESSAGE = /([\w\.]+|(\{.*\})) (.*)/;

export default (client: Client): void => {
	client.on("messageCreate", async (message) => {
		if (message.author.bot) return;
		if (message.channel.type === ChannelType.DM) return;
		if (!message.guild) return;
		let content = message.content;
		//detect roll between bracket
		const detectRoll = content.match(/\[(.*)\]/)?.[1];
		const rollWithMessage = content.match(DETECT_DICE_MESSAGE)?.[3];
		if (rollWithMessage && !detectRoll) {
			const diceValue = content.match(/^\S*#?d\S+|\{.*\}/);
			if (!diceValue) return;
			content = content.replace(DETECT_DICE_MESSAGE, "$1 /* $3 */");
		}
		let deleteInput=true;
		let result: Resultat| undefined;
		try {
			result = detectRoll ? roll(detectRoll) : roll(content);
		} catch(e) {
			return;
		}
		if (detectRoll) {
			deleteInput = false;
		}
		//is a valid roll as we are in the function so we can work as always

		const userLang = message.guild.preferredLocale ?? Locale.EnglishUS;
		const translation = ln(userLang);
		const channel = message.channel;
		if (!result) return;
		const parser = parseResult(result, translation);
		if (channel.name.startsWith("🎲")) {
			await message.reply({content: parser, allowedMentions: { repliedUser: false }});
			return;
		}
		let linkToOriginal = "";
		if (deleteInput) {
			message.delete();
		} else {
			linkToOriginal = `[↪ Source](${message.url})`;
		}
		const parentChannel = channel instanceof ThreadChannel ? channel.parent : channel;
		const thread = parentChannel instanceof TextChannel ? await findThread(parentChannel, translation.roll.reason) : await findForumChannel(parentChannel as ForumChannel, translation.roll.reason, channel as ThreadChannel);
		const msgToEdit = await thread.send("_ _");
		const signMessage = result.compare ? `${result.compare.sign} ${result.compare.value}` : "";
		const authorMention = `*${userMention(message.author.id)}* (🎲 \`${result.dice.replace(COMMENT_REGEX, "")} ${signMessage}\`)`;
		const msg = `${authorMention} - <t:${moment().unix()}> ${linkToOriginal}\n${parser}`;
		await msgToEdit.edit(msg);
		const idMessage = `↪ ${msgToEdit.url}`;
		const reply = deleteInput ?
			await channel.send({ content: `${authorMention}\n${parser}\n\n${idMessage}` })
			: await message.reply({ content: `${parser}\n\n${idMessage}` , allowedMentions: { repliedUser: false }});
		deleteAfter(reply, 180000);
		return;
		
	});
};