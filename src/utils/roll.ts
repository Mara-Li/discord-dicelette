import { deleteAfter } from "@commands/rolls/base_roll";
import { error} from "@console";
import { generateStatsDice, replaceFormulaInDice, roll } from "@dicelette/core";
import { DETECT_DICE_MESSAGE } from "@events/message_create";
import { Settings, Translation, UserData } from "@interface";
import { ln } from "@localization";
import { EClient } from "@main";
import { reply, timestamp, title } from "@utils";
import { findForumChannel,findThread } from "@utils/find";
import { CommandInteraction, CommandInteractionOptionResolver, ForumChannel, TextBasedChannel, TextChannel, ThreadChannel, User, userMention } from "discord.js";
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
export async function rollWithInteraction(
	interaction: CommandInteraction, 
	dice: string,
	channel: TextBasedChannel, 
	db: Settings,
	critical?: {failure?: number, success?: number},
	user?: User,
	charName?: string,
	infoRoll?: string,
) {
	if (!channel || channel.isDMBased() || !channel.isTextBased() || !interaction.guild) return;
	const ul = ln(interaction.locale);
	const rollWithMessage = dice.match(DETECT_DICE_MESSAGE)?.[3];
	if (rollWithMessage) {
		dice = dice.replace(DETECT_DICE_MESSAGE, "$1 /* $3 */");
	}
	const rollDice = roll(dice);
	if (!rollDice) {
		error("no valid dice :", dice);
		await reply(interaction,{ content: ul("error.invalidDice.withDice", {dice}), ephemeral: true });
		return;
	}
	const parser = parseResult(rollDice, ul, critical);
	const infoRollTotal = `${charName ? `__**${title(charName)}**__${ul("common.space")}:\n  `:"  "}${infoRoll ? `[__${title(infoRoll)}__] `:""}`;
	if (channel.name.startsWith("🎲") || db.get(interaction.guild.id, "disableThread") === true || (db.get(interaction.guild.id, "rollChannel") === channel.id)) {
		await reply(interaction,{ content: `${infoRollTotal}${parser}` });
		return;
	}
	const parentChannel = channel instanceof ThreadChannel ? channel.parent : channel;
	const thread = parentChannel instanceof TextChannel ? 
		await findThread(db, parentChannel, ul) : 
		await findForumChannel(channel.parent as ForumChannel, channel as ThreadChannel, db, ul);
	let mention : string = userMention(user?.id ?? interaction.user.id);
	mention = charName ? `__**${title(charName)}**__ (${mention})` : mention;
	const msg = `${mention} ${timestamp(db, interaction.guild.id)}\n  ${infoRoll ? `[__${title(infoRoll)}__] ` : ""}${parser}`;
	const msgToEdit = await thread.send("_ _");
	await msgToEdit.edit(msg);
	const idMessage = `↪ ${msgToEdit.url}`;
	const inter = await reply(interaction,{ content: `${infoRollTotal}${parser}\n\n${idMessage}`});
	const timer = db.get(interaction.guild.id, "deleteAfter") ?? 180000;
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
	const modificatorString = modificator > 0 ? `+${modificator}` : modificator < 0 ? `${modificator}` : "";
	const comparatorMatch = (/(?<sign>[><=!]+)(?<comparator>(\d+))/).exec(dice);
	let comparator = "";
	if (comparatorMatch) {
		//remove from dice
		dice = dice.replace(comparatorMatch[0], "");
		comparator = comparatorMatch[0];
	}
	const roll = `${replaceFormulaInDice(dice)}${modificatorString}${comparator} ${comments}`;
	await rollWithInteraction(interaction, 
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
	user?: User ) {
	const atq = removeAccents(options.getString(t("rAtq.atq_name.name"), true).toLowerCase());
	const comments = options.getString(t("dbRoll.options.comments.name")) ?? "";
	//search dice
	let dice = userStatistique.damage?.[atq.toLowerCase()];
	if (!dice) {
		await reply(interaction,{ content: ul("error.noDamage", {atq: title(atq), charName: charOptions ?? ""}), ephemeral: true });
		return;
	}
	dice = generateStatsDice(dice, userStatistique.stats);
	const modificator = options.getNumber(t("dbRoll.options.modificator.name")) ?? 0;
	const modificatorString = modificator > 0 ? `+${modificator}` : modificator < 0 ? `${modificator}` : "";
	const comparatorMatch = /(?<sign>[><=!]+)(?<comparator>(\d+))/.exec(dice);
	let comparator = "";
	if (comparatorMatch) {
		dice = dice.replace(comparatorMatch[0], "");
		comparator = comparatorMatch[0];
	}
	const roll = `${dice}${modificatorString}${comparator} ${comments}`;
	await rollWithInteraction(interaction, roll, interaction.channel as TextBasedChannel, client.settings, undefined, user, charOptions, atq);
}