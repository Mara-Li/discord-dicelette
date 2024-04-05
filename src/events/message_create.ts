/* eslint-disable no-useless-escape */
import { COMMENT_REGEX, Resultat,roll } from "@dicelette/core";
import {ChannelType, Client, ForumChannel, Locale, TextChannel, ThreadChannel, userMention} from "discord.js";

import { deleteAfter } from "../commands/rolls/base_roll";
import { parseResult } from "../dice";
import { lError, ln } from "../localizations";
import { timestamp } from "../utils";
import { readDB } from "../utils/db";
import { findForumChannel, findThread } from "../utils/find";


// eslint-disable-next-line no-useless-escape
export const DETECT_DICE_MESSAGE = /([\w\.]+|(\{.*\})) (.*)/;

export default (client: Client): void => {
	client.on("messageCreate", async (message) => {
		try {
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
			const ul = ln(userLang);
			const channel = message.channel;
			if (!result) return;
			const parser = parseResult(result, ul);
			if (channel.name.startsWith("🎲")) {
				await message.reply({content: parser, allowedMentions: { repliedUser: false }});
				return;
			}
			let linkToOriginal = "";
			if (deleteInput) {
				message.delete();
			} else {
				linkToOriginal = ` [↪ Source](${message.url})`;
			}
			const parentChannel = channel instanceof ThreadChannel ? channel.parent : channel;
			const thread = parentChannel instanceof TextChannel ? 
				await findThread(parentChannel, ul("roll.reason")) : 
				await findForumChannel(parentChannel as ForumChannel, ul("roll.reason"), channel as ThreadChannel);
			const msgToEdit = await thread.send("_ _");
			const signMessage = result.compare ? `${result.compare.sign} ${result.compare.value}` : "";
			const authorMention = `*${userMention(message.author.id)}* (🎲 \`${result.dice.replace(COMMENT_REGEX, "")} ${signMessage}\`)`;
			const msg = `${authorMention} ${timestamp()}${linkToOriginal}\n${parser}`;
			await msgToEdit.edit(msg);
			const idMessage = `↪ ${msgToEdit.url}`;
			const reply = deleteInput ?
				await channel.send({ content: `${authorMention}\n${parser}\n\n${idMessage}` })
				: await message.reply({ content: `${parser}\n\n${idMessage}` , allowedMentions: { repliedUser: false }});
			deleteAfter(reply, 180000);
			return;
		} catch (error) {
			console.error(error);
			if (!message.guild) return;
			const msgError = lError(error as Error, undefined, message?.guild?.preferredLocale);
			await message.reply({ content: msgError});
			const db = readDB(message.guild.id);
			if (!db) return;
			if (db.db.logs) {
				const logs = await message.guild.channels.fetch(db.db.logs);
				if (logs instanceof TextChannel) {
					logs.send(`\`\`\`\n${(error as Error).message}\n\`\`\``);
				}
			}
		}
		
	});
};