// noinspection RegExpRedundantEscape

import { COMMENT_REGEX, type Resultat, roll } from "@dicelette/core";
import { lError, ln } from "@localization";
import { type EClient, logger } from "@main";
import { deleteAfter, timestamp } from "@utils";
import { findForumChannel, findMessageBefore, findThread } from "@utils/find";
import * as Djs from "discord.js";
import { parseResult } from "../dice";

export const DETECT_DICE_MESSAGE = /([\w\.]+|(\{.*\})) (.*)/i;

export default (client: EClient): void => {
	client.on("messageCreate", async (message) => {
		try {
			if (message.author.bot) return;
			if (message.channel.type === Djs.ChannelType.DM) return;
			if (!message.guild) return;
			let content = message.content;
			//detect roll between bracket
			const detectRoll = content.match(/\[(.*)\]/)?.[1];
			const comments = content.match(DETECT_DICE_MESSAGE)?.[3].replaceAll("*", "\\*");
			if (comments && !detectRoll) {
				const diceValue = content.match(/^\S*#?d\S+|\{.*\}/i);
				if (!diceValue) return;
				content = content.replace(DETECT_DICE_MESSAGE, "$1");
			}
			let deleteInput = true;
			let result: Resultat | undefined;
			try {
				result = detectRoll
					? roll(detectRoll.toLowerCase())
					: roll(content.toLowerCase());
			} catch (e) {
				return;
			}
			if (detectRoll) {
				deleteInput = false;
			}

			//is a valid roll as we are in the function so we can work as always
			const userLang =
				client.settings.get(message.guild.id, "lang") ??
				message.guild.preferredLocale ??
				Djs.Locale.EnglishUS;
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
				if (client.settings.get(message.guild.id, "context")) {
					const messageBefore = await findMessageBefore(channel, message, client);
					if (messageBefore)
						linkToOriginal = `\n-# ↪ [${ul("common.context")}](<https://discord.com/channels/${message.guild.id}/${message.channel!.id}/${messageBefore!.id}>)`;
				}
			} else {
				linkToOriginal = `\n-# ↪ [${ul("common.context")}] (<${message.url}>)`;
			}
			const parentChannel =
				channel instanceof Djs.ThreadChannel ? channel.parent : channel;
			const thread =
				parentChannel instanceof Djs.TextChannel
					? await findThread(client.settings, parentChannel, ul)
					: await findForumChannel(
							parentChannel as Djs.ForumChannel,
							channel as Djs.ThreadChannel,
							client.settings,
							ul
						);
			const msgToEdit = await thread.send("_ _");
			const signMessage = result.compare
				? `${result.compare.sign} ${result.compare.value}`
				: "";
			const authorMention = `*${Djs.userMention(message.author.id)}* (🎲 \`${result.dice.replace(COMMENT_REGEX, "")}${signMessage ? ` ${signMessage}` : ""}\`)`;
			const msg = `${authorMention}${timestamp(client.settings, message.guild.id)}\n${parser}${linkToOriginal}`;
			await msgToEdit.edit(msg);
			const idMessage = client.settings.get(message.guild.id, "linkToLogs")
				? `\n\n-# ↪ ${msgToEdit.url}`
				: "";
			const reply = deleteInput
				? await channel.send({ content: `${authorMention}\n${parser}${idMessage}` })
				: await message.reply({
						content: `${parser}${idMessage}`,
						allowedMentions: { repliedUser: true },
					});
			const timer = client.settings.get(message.guild.id, "deleteAfter") ?? 180000;
			await deleteAfter(reply, timer);
			if (deleteInput) await message.delete();
			return;
		} catch (e) {
			logger.error(e);
			if (!message.guild) return;
			const userLang =
				client.settings.get(message.guild.id, "lang") ??
				message.guild.preferredLocale ??
				Djs.Locale.EnglishUS;
			const msgError = lError(e as Error, undefined, userLang);
			if (msgError.length === 0) return;
			await message.channel.send({ content: msgError });
			const logsId = client.settings.get(message.guild.id, "logs");
			if (logsId) {
				const logs = await message.guild.channels.fetch(logsId);
				if (logs instanceof Djs.TextChannel) {
					await logs.send(`\`\`\`\n${(e as Error).message}\n\`\`\``);
				}
			}
		}
	});
};
