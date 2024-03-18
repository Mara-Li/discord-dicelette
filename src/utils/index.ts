import { BaseInteraction, CommandInteraction, EmbedBuilder, ForumChannel, GuildForumTagData, TextBasedChannel, TextChannel, ThreadChannel, userMention } from "discord.js";
import { evaluate } from "mathjs";
import moment from "moment";
import removeAccents from "remove-accents";

import { deleteAfter } from "../commands/base";
import { parseResult,roll } from "../dice";
import { DETECT_DICE_MESSAGE } from "../events/message_create";
import {User} from "../interface";
import { ln } from "../localizations";
import { registerUser } from "./db";
import { findForumChannel,findThread } from "./find";
import { getFormula } from "./verify_template";

export async function rollWithInteraction(interaction: CommandInteraction, dice: string, channel: TextBasedChannel, critical?: {failure?: number, success?: number}) {
	if (!channel || channel.isDMBased() || !channel.isTextBased()) return;
	const userLang = ln(interaction.locale);
	const rollWithMessage = dice.match(DETECT_DICE_MESSAGE)?.[3];
	if (rollWithMessage) {
		dice = dice.replace(DETECT_DICE_MESSAGE, "$1 /* $3 */");
	}
	const rollDice = roll(dice);
	if (!rollDice) {
		console.error("no valid dice :", dice);
		await interaction.reply({ content: userLang.error.noValidDice(undefined, dice), ephemeral: true });
		return;
	}
	const parser = parseResult(rollDice, userLang, critical);
	if (channel.name.startsWith("🎲")) {
		await interaction.reply({ content: parser });
		return;
	}
	//sort threads by date by most recent
	const parentChannel = channel instanceof ThreadChannel ? channel.parent : channel;
	const thread = parentChannel instanceof TextChannel ? await findThread(parentChannel, userLang.roll.reason) : await findForumChannel(channel.parent as ForumChannel, userLang.roll.reason, channel as ThreadChannel);
	const msg = `${userMention(interaction.user.id)} ${timestamp()}\n${parser}`;
	const msgToEdit = await thread.send("_ _");
	await msgToEdit.edit(msg);
	const idMessage = `↪ ${msgToEdit.url}`;
	const inter = await interaction.reply({ content: `${parser}\n\n${idMessage}`});
	deleteAfter(inter, 180000);
	return;
	
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

export function title(str?: string) {
	if (!str) return;
	return str.charAt(0).toUpperCase() + str.slice(1);
}

export async function repostInThread(embed: EmbedBuilder, interaction: BaseInteraction, userTemplate: User, userId: string) {
	const channel = interaction.channel;
	if (!channel ||!(channel instanceof TextChannel)) return;
	let thread = (await channel.threads.fetch()).threads.find(thread => thread.name === "📝 • [STATS]") as ThreadChannel | undefined;
	if (!thread) {
		thread = await channel.threads.create({
			name: "📝 • [STATS]",
			autoArchiveDuration: 10080,
		});
	}
	userTemplate.userName = userTemplate.userName ? removeAccents(userTemplate.userName).toLowerCase() : undefined;
	const msg = await thread.send({ 
		embeds: [embed] },);
	const damageName = userTemplate.damage ? Object.keys(userTemplate.damage) : undefined;	
	registerUser(userId, interaction, msg.id, thread, userTemplate.userName, damageName);
}


export function timestamp() {
	return `• <t:${moment().unix()}:d>-<t:${moment().unix()}:t>`;
}

export function calculate(userStat: number, diceType?: string, override?: string|null, modificator: number = 0) {
	const formula = getFormula(diceType);
	let comparator: string = "";
	if (!override && formula) {
		comparator += formula.sign ?? "";
		const value = formula.comparator?.replace("$", userStat.toString());
		comparator += value ? evaluate(value.toString()) : userStat.toString();
	} else if (override) comparator = override;
	let calculation = formula?.formula;
	if (calculation) {
		try {
			calculation = calculation.replace("{{", "").replace("}}", "").replace("$", userStat.toString());
			calculation = evaluate(`${calculation}+ ${modificator}`).toString();
		} catch (error) {
			throw `[ulError.invalidFormula], ${calculation}`;
		}
		calculation = calculation?.startsWith("-") ? calculation : `+${calculation}`;
	} else calculation = modificator ? modificator > 0 ? `+${modificator}` : modificator.toString() : "";
	return {calculation, comparator};
}