import { deleteAfter } from "@commands/rolls/base_roll";
import { generateStatsDice, replaceFormulaInDice, roll } from "@dicelette/core";
import { DETECT_DICE_MESSAGE } from "@events/message_create";
import type { Settings, Translation, UserData } from "@interface";
import { ln } from "@localization";
import type { EClient } from "@main";
import { reply, timestamp, title } from "@utils";
import { findForumChannel, findThread } from "@utils/find";
import {
	type CommandInteraction,
	type CommandInteractionOptionResolver,
	type ForumChannel,
	type TextBasedChannel,
	TextChannel,
	ThreadChannel,
	type User,
	userMention,
} from "discord.js";
import i18next from "i18next";
import removeAccents from "remove-accents";

import { parseResult } from "../dice";

const t = i18next.getFixedT("en");

/**
 * create the roll dice, parse interaction etc... When the slashcommands is used for dice
 * @param interaction {CommandInteraction}
 * @param dice {string}
 * @param channel {TextBasedChannel}
 * @param critical {failure?: number, success?: number}
 */
export async function rollWithInteraction(
	interaction: CommandInteraction,
	dice: string,
	channel: TextBasedChannel,
	db: Settings,
	critical?: { failure?: number; success?: number },
	user?: User,
	charName?: string,
	infoRoll?: string
) {
	if (!channel || channel.isDMBased() || !channel.isTextBased() || !interaction.guild)
		return;
	const ul = ln(interaction.guild.preferredLocale ?? interaction.locale);
	const comments = dice.match(DETECT_DICE_MESSAGE)?.[3];
	if (comments) {
		//biome-ignore lint/style/noParameterAssign: We need to replace the dice with the message
		dice = dice.replace(DETECT_DICE_MESSAGE, "$1");
	}
	//biome-ignore lint/style/noParameterAssign: We need to replace the dice with the message
	dice = dice.trim();
	const rollDice = roll(dice.trim());
	if (!rollDice) {
		await reply(interaction, {
			content: ul("error.invalidDice.withDice", { dice }),
			ephemeral: true,
		});
		return;
	}
	if (comments) {
		rollDice.comment = comments;
		rollDice.dice = `${dice} /* ${comments} */`;
	}

	const parser = parseResult(rollDice, ul, critical, !!infoRoll);
	const userId = user?.id ?? interaction.user.id;
	let mentionUser: string = userMention(userId);
	const titleCharName = `__**${title(charName)}**__`;
	mentionUser = charName ? `${titleCharName} (${mentionUser})` : mentionUser;
	const infoRollTotal = (mention?: boolean, time?: boolean) => {
		let user = " ";
		if (mention) user = mentionUser;
		else if (charName) user = titleCharName;
		if (time) user += `${timestamp(db, interaction.guild!.id)}`;
		if (user.trim().length > 0) user += `${ul("common.space")}:\n  `;
		if (infoRoll) return `${user}[__${title(infoRoll)}__] `;
		return user;
	};
	const retrieveUser = infoRollTotal(true);
	const hasDB = db.has(interaction.guild.id);
	if (
		channel.name.startsWith("🎲") ||
		(hasDB &&
			(db.get(interaction.guild.id, "disableThread") === true ||
				db.get(interaction.guild.id, "rollChannel") === channel.id))
	) {
		await reply(interaction, {
			content: `${retrieveUser}${parser}`,
			allowedMentions: { users: [userId] },
		});
		return;
	}
	const parentChannel = channel instanceof ThreadChannel ? channel.parent : channel;
	const thread =
		parentChannel instanceof TextChannel
			? await findThread(db, parentChannel, ul)
			: await findForumChannel(
					channel.parent as ForumChannel,
					channel as ThreadChannel,
					db,
					ul
				);

	const msgToEdit = await thread.send("_ _");
	await msgToEdit.edit(`${infoRollTotal(true, true)}${parser}`);
	const idMessage = `↪ ${msgToEdit.url}`;
	const inter = await reply(interaction, {
		content: `${retrieveUser}${parser}\n\n${idMessage}`,
		allowedMentions: { users: [userId] },
	});
	const timer =
		hasDB && db.get(interaction.guild.id, "deleteAfter")
			? (db.get(interaction.guild.id, "deleteAfter") as number)
			: 180000;
	deleteAfter(inter, timer);
	return;
}

export async function rollStatistique(
	interaction: CommandInteraction,
	client: EClient,
	userStatistique: UserData,
	options: CommandInteractionOptionResolver,
	ul: Translation,
	optionChar?: string,
	user?: User
) {
	const statistique = options.getString(t("common.statistic"), true).toLowerCase();
	//model : {dice}{stats only if not comparator formula}{bonus/malus}{formula}{override/comparator}{comments}
	const comments = options.getString(t("dbRoll.options.comments.name")) ?? "";
	const override = options.getString(t("dbRoll.options.override.name"));
	const modificator = options.getNumber(t("dbRoll.options.modificator.name")) ?? 0;
	const userStat = userStatistique.stats?.[removeAccents(statistique)];
	const template = userStatistique.template;
	let dice = template.diceType?.replaceAll("$", userStat!.toString());
	if (!dice) {
		await reply(interaction, { content: ul("error.noDice"), ephemeral: true });
		return;
	}
	if (override) {
		const signRegex = /(?<sign>[><=!]+)(?<comparator>(\d+))/;
		const diceMatch = signRegex.exec(dice);
		const overrideMatch = signRegex.exec(override);
		if (diceMatch && overrideMatch && diceMatch.groups && overrideMatch.groups) {
			dice = dice.replace(diceMatch[0], overrideMatch[0]);
		} else if (!diceMatch && overrideMatch) {
			dice += overrideMatch[0];
		}
	}
	const modificatorString =
		modificator > 0 ? `+${modificator}` : modificator < 0 ? `${modificator}` : "";
	const comparatorMatch = /(?<sign>[><=!]+)(?<comparator>(\d+))/.exec(dice);
	let comparator = "";
	if (comparatorMatch) {
		//remove from dice
		dice = dice.replace(comparatorMatch[0], "").trim();
		comparator = comparatorMatch[0];
	}
	const roll = `${replaceFormulaInDice(dice)}${modificatorString}${comparator} ${comments}`;
	await rollWithInteraction(
		interaction,
		roll,
		interaction!.channel as TextBasedChannel,
		client.settings,
		template.critical,
		user,
		optionChar,
		statistique
	);
}

export async function rollDice(
	interaction: CommandInteraction,
	client: EClient,
	userStatistique: UserData,
	options: CommandInteractionOptionResolver,
	ul: Translation,
	charOptions?: string,
	user?: User
) {
	const atq = removeAccents(
		options.getString(t("rAtq.atq_name.name"), true).toLowerCase()
	);
	const comments = options.getString(t("dbRoll.options.comments.name")) ?? "";
	//search dice
	let dice = userStatistique.damage?.[atq.toLowerCase()];
	if (!dice) {
		await reply(interaction, {
			content: ul("error.noDamage", { atq: title(atq), charName: charOptions ?? "" }),
			ephemeral: true,
		});
		return;
	}
	dice = generateStatsDice(dice, userStatistique.stats);
	const modificator = options.getNumber(t("dbRoll.options.modificator.name")) ?? 0;
	const modificatorString =
		modificator > 0 ? `+${modificator}` : modificator < 0 ? `${modificator}` : "";
	const comparatorMatch = /(?<sign>[><=!]+)(?<comparator>(\d+))/.exec(dice);
	let comparator = "";
	if (comparatorMatch) {
		dice = dice.replace(comparatorMatch[0], "");
		comparator = comparatorMatch[0];
	}
	const roll = `${dice}${modificatorString}${comparator} ${comments}`;
	await rollWithInteraction(
		interaction,
		roll,
		interaction.channel as TextBasedChannel,
		client.settings,
		undefined,
		user,
		charOptions,
		atq
	);
}
