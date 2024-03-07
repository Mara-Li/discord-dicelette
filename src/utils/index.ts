import { CommandInteraction, EmbedBuilder, FetchArchivedThreadOptions, FetchThreadsOptions, ForumChannel, GuildForumTagData, ModalSubmitInteraction, TextBasedChannel, TextChannel, ThreadChannel, userMention } from "discord.js";
import moment from "moment";

import { deleteAfter } from "../commands/base";
import { parseResult,roll } from "../dice";
import { DETECT_DICE_MESSAGE } from "../events/message_create";
import {User} from "../interface";
import en from "../localizations/locales/en";
import fr from "../localizations/locales/fr";
import { registerUser } from "./db";
import { findForumChannel,findThread } from "./find";
import { ln } from "../localizations";

export async function rollWithInteraction(interaction: CommandInteraction, dice: string, channel: TextBasedChannel, critical?: {failure?: number, success?: number}) {
	if (!channel || channel.isDMBased() || !channel.isTextBased()) return;
	const userLang = ln(interaction.locale);
	const rollWithMessage = dice.match(DETECT_DICE_MESSAGE)?.[3];
	if (rollWithMessage) {
		dice = dice.replace(DETECT_DICE_MESSAGE, "$1 /* $3 */");
	}
	const rollDice = roll(dice);
	if (!rollDice) {
		await interaction.reply({ content: userLang.roll.noValidDice, ephemeral: true });
		return;
	}
	const parser = parseResult(rollDice, userLang, critical);
	if (channel instanceof TextChannel && channel.name.startsWith("🎲")) {
		await interaction.reply({ content: parser });
		return;
	}
	if (channel instanceof TextChannel || (channel.parent instanceof ForumChannel && !channel.name.startsWith("🎲"))) {
		//sort threads by date by most recent
		const thread = channel instanceof TextChannel ? await findThread(channel, userLang.roll.reason) : await findForumChannel(channel.parent as ForumChannel, userLang.roll.reason, channel as ThreadChannel);
		const msg = `${userMention(interaction.user.id)} - <t:${moment().unix()}>\n${parser}`;
		const msgToEdit = await thread.send("_ _");
		await msgToEdit.edit(msg);
		const idMessage = `↪ ${msgToEdit.url}`;
		const inter = await interaction.reply({ content: `${parser}\n\n${idMessage}`});
		deleteAfter(inter, 180000);
		return;
	} //run in thread ; no need to log and delete
	await interaction.reply({ content: parser });
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

export function title(str: string) {
	return str.charAt(0).toUpperCase() + str.slice(1);
}

export async function repostInThread(embed: EmbedBuilder, interaction: ModalSubmitInteraction, userTemplate: User, userId: string) {
	const channel = interaction.channel;
	if (!channel ||!(channel instanceof TextChannel)) return;
	let thread = (await channel.threads.fetch()).threads.find(thread => thread.name === "📝 • [STATS]") as ThreadChannel | undefined;
	if (!thread) {
		thread = await channel.threads.create({
			name: "📝 • [STATS]",
			autoArchiveDuration: 10080,
		});
	}
	const msg = await thread.send({ embeds: [embed], files: [{ attachment: Buffer.from(JSON.stringify(userTemplate, null, 2), "utf-8"), name: "template.json" }] },);
	registerUser(userId, interaction, msg.id, userTemplate.userName);
}


