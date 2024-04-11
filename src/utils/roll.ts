import { deleteAfter } from "@commands/rolls/base_roll";
import { replaceFormulaInDice, roll } from "@dicelette/core";
import { DETECT_DICE_MESSAGE } from "@events/message_create";
import { Settings, Translation, UserData } from "@interface";
import { ln } from "@localization";
import { EClient } from "@main";
import { reply, timestamp, title } from "@utils";
import { findForumChannel,findThread } from "@utils/find";
import { CommandInteraction, CommandInteractionOptionResolver, ForumChannel, TextBasedChannel, TextChannel, ThreadChannel, userMention } from "discord.js";
import i18next from "i18next";
import removeAccents from "remove-accents";

import { parseResult } from "../dice";

const t= i18next.getFixedT("en");

/**
 * create the roll dice, parse interaction etc... When the slashcommands is used for dice
 * @param interaction {CommandInteraction}
 * @param dice {string}
 * @param channel {TextBasedChannel}
 * @param critical {failure?: number, success?: number}
 */
export async function rollWithInteraction(interaction: CommandInteraction, dice: string, channel: TextBasedChannel, db: Settings,critical?: {failure?: number, success?: number}) {
	if (!channel || channel.isDMBased() || !channel.isTextBased() || !interaction.guild) return;
	const ul = ln(interaction.locale);
	const rollWithMessage = dice.match(DETECT_DICE_MESSAGE)?.[3];
	if (rollWithMessage) {
		dice = dice.replace(DETECT_DICE_MESSAGE, "$1 /* $3 */");
	}
	const rollDice = roll(dice);
	if (!rollDice) {
		console.error("no valid dice :", dice);
		await reply(interaction,{ content: ul("error.invalidDice.withDice", {dice}), ephemeral: true });
		return;
	}
	const parser = parseResult(rollDice, ul, critical);
	if (channel.name.startsWith("🎲") || db.get(interaction.guild.id, "disableThread") === true) {
		await reply(interaction,{ content: parser });
		return;
	}
	const parentChannel = channel instanceof ThreadChannel ? channel.parent : channel;
	const thread = parentChannel instanceof TextChannel ? 
		await findThread(db, parentChannel, ul("roll.reason")) : 
		await findForumChannel(channel.parent as ForumChannel, ul("roll.reason"), channel as ThreadChannel, db);
	const msg = `${userMention(interaction.user.id)} ${timestamp()}\n${parser}`;
	const msgToEdit = await thread.send("_ _");
	await msgToEdit.edit(msg);
	const idMessage = `↪ ${msgToEdit.url}`;
	const inter = await reply(interaction,{ content: `${parser}\n\n${idMessage}`});
	deleteAfter(inter, 180000);
	return;
	
}


export async function rollStatistique(interaction: CommandInteraction, client: EClient, userStatistique: UserData, options: CommandInteractionOptionResolver, ul: Translation, optionChar?: string,
) {
	const statistique = options.getString(t("common.statistic"), true).toLowerCase();
	//model : {dice}{stats only if not comparator formula}{bonus/malus}{formula}{override/comparator}{comments}
	let comments = options.getString(t("dbRoll.options.comments.name")) ?? "";
	const override = options.getString(t("dbRoll.options.override.name"));
	const modificator = options.getNumber(t("dbRoll.options.modificator.name")) ?? 0;
	const userStat = userStatistique.stats?.[removeAccents(statistique)];
	const template = userStatistique.template;
	let dice = template.diceType?.replaceAll("$", userStat!.toString());
	if (!dice) {
		await reply(interaction,{ content: ul("error.noDice"), ephemeral: true });
		return;
	}
	if (override) {
		const SIGN_REGEX =/(?<sign>[><=!]+)(?<comparator>(\d+))/;
		const diceMatch = SIGN_REGEX.exec(dice);
		const overrideMatch = SIGN_REGEX.exec(override);
		if (diceMatch && overrideMatch && diceMatch.groups && overrideMatch.groups) {
			dice = dice.replace(diceMatch[0], overrideMatch[0]);
		} else if (!diceMatch && overrideMatch) {
			dice += overrideMatch[0];
		}
	}
	const charNameComments = optionChar ? ` • **@${title(optionChar)}**` : "";
	comments += ` __[${title(statistique)}]__${charNameComments}`;
	const modificatorString = modificator > 0 ? `+${modificator}` : modificator < 0 ? `${modificator}` : "";
	const comparatorMatch = (/(?<sign>[><=!]+)(?<comparator>(\d+))/).exec(dice);
	let comparator = "";
	if (comparatorMatch) {
		//remove from dice
		dice = dice.replace(comparatorMatch[0], "");
		comparator = comparatorMatch[0];
	}
	const roll = `${replaceFormulaInDice(dice)}${modificatorString}${comparator} ${comments}`;
	await rollWithInteraction(interaction, roll, interaction!.channel as TextBasedChannel, client.settings, template.critical);
	
}