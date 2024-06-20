import { deleteAfter } from "@commands/rolls/base_roll";
import { error } from "@console";
import { COMMENT_REGEX, type Resultat, roll } from "@dicelette/core";
import { lError, ln } from "@localization";
import type { EClient } from "@main";
import { timestamp } from "@utils";
import { findForumChannel, findThread } from "@utils/find";
import {
	ChannelType,
	type ForumChannel,
	Locale,
	TextChannel,
	ThreadChannel,
	userMention,
} from "discord.js";

import { parseResult } from "../dice";

export const DETECT_DICE_MESSAGE = /([\w\.]+|(\{.*\})) (.*)/;

export default (client: EClient): void => {
	client.on("messageCreate", async (message) => {
		try {
			if (message.author.bot) return;
			if (message.channel.type === ChannelType.DM) return;
			if (!message.guild) return;
			let content = message.content;
			//detect roll between bracket
			const detectRoll = content.match(/\[(.*)\]/)?.[1];
			const comments = content.match(DETECT_DICE_MESSAGE)?.[3];
			if (comments && !detectRoll) {
				const diceValue = content.match(/^\S*#?d\S+|\{.*\}/);
				if (!diceValue) return;
				content = content.replace(DETECT_DICE_MESSAGE, "$1");
			}
			let deleteInput = true;
			let result: Resultat | undefined;
			try {
				result = detectRoll ? roll(detectRoll) : roll(content);
			} catch (e) {
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
			if (comments && !detectRoll && result) {
				result.dice = `${result.dice} /* ${comments} */`;
				result.comment = comments;
			}
			const parser = parseResult(result, ul);
			if (
				channel.name.startsWith("🎲") ||
				client.settings.get(message.guild.id, "disableThread") === true ||
				client.settings.get(message.guild.id, "rollChannel") === channel.id
			) {
				await message.reply({ content: parser, allowedMentions: { repliedUser: true } });
				return;
			}
			let linkToOriginal = "";
			if (deleteInput) {
				message.delete();
				if (client.settings.get(message.guild.id, "context")) {
					const messagesBefore = await channel.messages.fetch({
						before: message.id,
						limit: 1,
					});
					const messageBefore = messagesBefore.first();
					if (messagesBefore)
						linkToOriginal = `\n-# ↪ [Contexte](<https://discord.com/channels/${message.guild.id}/${message.channel!.id}/${messageBefore!.id}>)`;
				}
			} else {
				linkToOriginal = `\n-# ↪ [Contexte] (<${message.url}>)`;
			}
			const parentChannel = channel instanceof ThreadChannel ? channel.parent : channel;
			const thread =
				parentChannel instanceof TextChannel
					? await findThread(client.settings, parentChannel, ul)
					: await findForumChannel(
							parentChannel as ForumChannel,
							channel as ThreadChannel,
							client.settings,
							ul
						);
			const msgToEdit = await thread.send("_ _");
			const signMessage = result.compare
				? `${result.compare.sign} ${result.compare.value}`
				: "";
			const authorMention = `*${userMention(message.author.id)}* (🎲 \`${result.dice.replace(COMMENT_REGEX, "")} ${signMessage}\`)`;
			const msg = `${authorMention}${timestamp(client.settings, message.guild.id)}\n${parser}${linkToOriginal}`;
			await msgToEdit.edit(msg);
			const idMessage = client.settings.get(message.guild.id, "linkToLogs")
				? `\n\n↪ ${msgToEdit.url}`
				: "";
			const reply = deleteInput
				? await channel.send({ content: `${authorMention}\n${parser}${idMessage}` })
				: await message.reply({
						content: `${parser}${idMessage}`,
						allowedMentions: { repliedUser: true },
					});
			const timer = client.settings.get(message.guild.id, "deleteAfter") ?? 180000;
			deleteAfter(reply, timer);
			return;
		} catch (e) {
			error(e);
			if (!message.guild) return;
			const msgError = lError(e as Error, undefined, message?.guild?.preferredLocale);
			await message.reply({ content: msgError });
			const logsId = client.settings.get(message.guild.id, "logs");
			if (logsId) {
				const logs = await message.guild.channels.fetch(logsId);
				if (logs instanceof TextChannel) {
					logs.send(`\`\`\`\n${(e as Error).message}\n\`\`\``);
				}
			}
		}
	});
};
