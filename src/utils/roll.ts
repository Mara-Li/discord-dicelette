import { ln, t } from "@localization";

import { generateStatsDice, replaceFormulaInDice, roll } from "@dicelette/core";
import { DETECT_DICE_MESSAGE } from "@events/message_create";
import type { UserData } from "@interfaces/database";
import type { Settings, Translation } from "@interfaces/discord";
import { logger } from "@logger";
import type { EClient } from "@main";

import { deleteAfter, embedError, reply, timestamp } from "@utils";
import { findForumChannel, findMessageBefore, findThread } from "@utils/find";
import * as Djs from "discord.js";
import { parseResult } from "../dice";

/**
 * create the roll dice, parse interaction etc... When the slash-commands is used for dice
 */
export async function rollWithInteraction(
	interaction: Djs.CommandInteraction,
	dice: string,
	channel: Djs.TextBasedChannel,
	db: Settings,
	critical?: { failure?: number; success?: number },
	user?: Djs.User,
	charName?: string,
	infoRoll?: { name: string; standardized: string },
	hideResult?: boolean | null
) {
	if (!channel || channel.isDMBased() || !channel.isTextBased() || !interaction.guild)
		return;
	const langToUser =
		db.get(interaction.guild.id, "lang") ??
		interaction.guild.preferredLocale ??
		interaction.locale;
	const ul = ln(langToUser);
	const comments = dice.match(DETECT_DICE_MESSAGE)?.[3].replaceAll("*", "\\*");
	if (comments) {
		//biome-ignore lint/style/noParameterAssign: We need to replace the dice with the message
		dice = dice.replace(DETECT_DICE_MESSAGE, "$1");
	}
	//biome-ignore lint/style/noParameterAssign: We need to replace the dice with the message
	dice = dice.trim();
	const rollDice = roll(dice.trim().toLowerCase());
	if (!rollDice) {
		await reply(interaction, {
			embeds: [embedError(ul("error.invalidDice.withDice", { dice }), ul)],
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
	let mentionUser: string = Djs.userMention(userId);
	const titleCharName = `__**${charName?.capitalize()}**__`;
	mentionUser = charName ? `${titleCharName} (${mentionUser})` : mentionUser;
	const infoRollTotal = (mention?: boolean, time?: boolean) => {
		let user = " ";
		if (mention) user = mentionUser;
		else if (charName) user = titleCharName;
		if (time) user += `${timestamp(db, interaction.guild!.id)}`;
		if (user.trim().length > 0) user += `${ul("common.space")}:\n`;
		if (infoRoll) return `${user}[__${infoRoll.name.capitalize()}__] `;
		return user;
	};
	const retrieveUser = infoRollTotal(true);
	const disableThread = db.get(interaction.guild.id, "disableThread");
	let rollChannel = db.get(interaction.guild.id, "rollChannel");
	const hideResultConfig = db.get(interaction.guild.id, "hiddenRoll");
	const hidden = hideResult && hideResultConfig;
	let isHidden: undefined | string = undefined;
	if (hidden) {
		if (typeof hideResultConfig === "string") {
			//send to another channel ;
			rollChannel = hideResultConfig;
			isHidden = hideResultConfig;
		} else if (typeof hideResultConfig === "boolean") {
			await reply(interaction, {
				content: `${retrieveUser}${parser}`,
				allowedMentions: { users: [userId] },
				ephemeral: true,
			});
			return;
		}
	}
	if (channel.name.startsWith("🎲") || disableThread || rollChannel === channel.id) {
		await reply(interaction, {
			content: `${retrieveUser}${parser}`,
			allowedMentions: { users: [userId] },
			ephemeral: !!hidden,
		});
		return;
	}
	const parentChannel = channel instanceof Djs.ThreadChannel ? channel.parent : channel;
	const thread =
		parentChannel instanceof Djs.TextChannel
			? await findThread(db, parentChannel, ul, isHidden)
			: await findForumChannel(
					channel.parent as Djs.ForumChannel,
					channel as Djs.ThreadChannel,
					db,
					ul,
					isHidden
				);

	const rolLog = await thread.send("_ _");
	await rolLog.edit(`${infoRollTotal(true, true)}${parser}`);
	const rollLogEnabled = db.get(interaction.guild.id, "linkToLogs");
	const rolLogUrl = rollLogEnabled ? `\n\n-# ↪ ${rolLog.url}` : "";
	const inter = await reply(interaction, {
		content: `${retrieveUser}${parser}${rolLogUrl}`,
		allowedMentions: { users: [userId] },
		ephemeral: !!hidden,
	});
	const anchor = db.get(interaction.guild.id, "context");
	const dbTime = db.get(interaction.guild.id, "deleteAfter");
	const timer = dbTime ? dbTime : 180000;

	let url = "";
	if (anchor) {
		url = `\n-# ↪ [${ul("common.context")}](<https://discord.com/channels/${interaction.guild.id}/${interaction.channel!.id}/${inter.id}>)`;
		if (timer && timer > 0) {
			const messageBefore = await findMessageBefore(channel, inter, interaction.client);
			if (messageBefore)
				url = `\n\n-# ↪ [${ul("common.context")}](<https://discord.com/channels/${interaction.guild.id}/${interaction.channel!.id}/${messageBefore!.id}>)`;
		}
		await rolLog.edit(`${infoRollTotal(true, true)}${parser}${url}`);
	}
	if (!disableThread) await deleteAfter(inter, timer);
	return;
}

export async function rollStatistique(
	interaction: Djs.CommandInteraction,
	client: EClient,
	userStatistique: UserData,
	options: Djs.CommandInteractionOptionResolver,
	ul: Translation,
	optionChar?: string,
	user?: Djs.User,
	hideResult?: boolean | null
) {
	let statistic = options.getString(t("common.statistic"), true);
	let standardizedStatistic = statistic.standardize(true);
	//model : {dice}{stats only if not comparator formula}{bonus/malus}{formula}{override/comparator}{comments}
	const comments = options.getString(t("dbRoll.options.comments.name")) ?? "";
	const override = options.getString(t("dbRoll.options.override.name"));
	const modification = options.getNumber(t("dbRoll.options.modificator.name")) ?? 0;

	let userStat = userStatistique.stats?.[standardizedStatistic];
	while (!userStat) {
		const guildData = client.settings.get(interaction.guild!.id, "templateID.statsName");
		if (userStatistique.stats && guildData) {
			const findStatInList = guildData.find((stat) =>
				stat.subText(standardizedStatistic)
			);
			if (findStatInList) {
				standardizedStatistic = findStatInList.standardize(true);
				statistic = findStatInList;
				userStat = userStatistique.stats[findStatInList.standardize(true)];
			}
		}
		if (userStat) break;
		throw new Error(
			ul("error.noStat", {
				stat: standardizedStatistic.capitalize(),
				char: optionChar ? ` ${optionChar.capitalize()}` : "",
			})
		);
	}
	const template = userStatistique.template;
	let dice = template.diceType?.replaceAll("$", userStat.toString());
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
	const modificationString =
		modification > 0 ? `+${modification}` : modification < 0 ? `${modification}` : "";
	const comparatorMatch = /(?<sign>[><=!]+)(?<comparator>(\d+))/.exec(dice);
	let comparator = "";
	if (comparatorMatch) {
		//remove from dice
		dice = dice.replace(comparatorMatch[0], "").trim();
		comparator = comparatorMatch[0];
	}
	const roll = `${replaceFormulaInDice(dice).trimAll()}${modificationString}${comparator} ${comments}`;
	await rollWithInteraction(
		interaction,
		roll,
		interaction!.channel as Djs.TextBasedChannel,
		client.settings,
		template.critical,
		user,
		optionChar,
		{ name: statistic, standardized: standardizedStatistic },
		hideResult
	);
}

export async function rollDice(
	interaction: Djs.CommandInteraction,
	client: EClient,
	userStatistique: UserData,
	options: Djs.CommandInteractionOptionResolver,
	ul: Translation,
	charOptions?: string,
	user?: Djs.User,
	hideResult?: boolean | null
) {
	let atq = options.getString(t("rAtq.atq_name.name"), true);
	const infoRoll = {
		name: atq,
		standardized: atq.standardize(),
	};
	atq = atq.standardize();
	const comments = options.getString(t("dbRoll.options.comments.name")) ?? "";
	//search dice
	let dice = userStatistique.damage?.[atq];
	while (!dice) {
		const userData = client.settings
			.get(interaction.guild!.id, `user.${user?.id ?? interaction.user.id}`)
			?.find((char) => {
				return char.charName?.subText(charOptions);
			});
		const damageName = userData?.damageName ?? [];
		const findAtqInList = damageName.find((atqName) => atqName.subText(atq));
		if (findAtqInList) {
			atq = findAtqInList;
			dice = userStatistique.damage?.[findAtqInList];
		}
		if (dice) break;
		await reply(interaction, {
			embeds: [
				embedError(
					ul("error.noDamage", {
						atq: infoRoll.name.capitalize(),
						charName: charOptions ?? "",
					}),
					ul
				),
			],
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
	const roll = `${dice.trimAll()}${modificatorString}${comparator} ${comments}`;
	logger.debug(dice.trimAll());
	await rollWithInteraction(
		interaction,
		roll,
		interaction.channel as Djs.TextBasedChannel,
		client.settings,
		undefined,
		user,
		charOptions,
		infoRoll,
		hideResult
	);
}
