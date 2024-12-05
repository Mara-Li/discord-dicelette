import type { UserMessageId, UserRegistration } from "@dicelette:types/database";
import { NoEmbed } from "@dicelette:utils/errors";
import { evalStatsDice, roll } from "@dicelette/core";
import { findln, ln } from "@dicelette/localization";
import type { Settings, Translation } from "@dicelette/types";
import { editUserButtons, registerDmgButton } from "buttons";
import { getTemplateWithDB } from "database/get_template";
import { getUserByEmbed, getUserNameAndChar } from "database/get_user";
import { registerUser } from "database/register_user";
import * as Djs from "discord.js";
import {
	createDiceEmbed,
	embedError,
	ensureEmbed,
	getEmbeds,
	getEmbedsList,
	parseStatsString,
	removeEmbedsFromList,
} from "messages/embeds";
import { displayOldAndNewStats, reply, sendLogs } from "messages/send";
import { addAutoRole } from "utils";
/**
 * Interaction to submit the new skill dice
 * Only works if the user is the owner of the user registered in the embed or if the user is a moderator
 * @param interaction {Djs.ModalSubmitInteraction}
 * @param ul {Translation}
 * @param interactionUser {User}
 * @param db
 */
export async function storeDamageDice(
	interaction: Djs.ModalSubmitInteraction,
	ul: Translation,
	interactionUser: Djs.User,
	db: Settings
) {
	const template = await getTemplateWithDB(interaction, db);
	if (!template) {
		await reply(interaction, { embeds: [embedError(ul("error.noTemplate"), ul)] });
		return;
	}
	const embed = ensureEmbed(interaction.message ?? undefined);
	const user =
		embed.fields
			.find((field) => findln(field.name) === "common.user")
			?.value.replace("<@", "")
			.replace(">", "") === interactionUser.id;
	const isModerator = interaction.guild?.members.cache
		.get(interactionUser.id)
		?.permissions.has(Djs.PermissionsBitField.Flags.ManageRoles);
	if (user || isModerator)
		await registerDamageDice(interaction, db, interaction.customId.includes("first"));
	else await reply(interaction, { content: ul("modals.noPermission"), ephemeral: true });
}

/**
 * Register the new skill dice in the embed and database
 * @param interaction {Djs.ModalSubmitInteraction}
 * @param db
 * @param first {boolean}
 * - true: It's the modal when the user is registered
 * - false: It's the modal when the user is already registered and a new dice is added to edit the user
 */
export async function registerDamageDice(
	interaction: Djs.ModalSubmitInteraction,
	db: Settings,
	first?: boolean
) {
	const lang = db.get(interaction.guild!.id, "lang") ?? interaction.locale;
	const ul = ln(lang);
	const name = interaction.fields.getTextInputValue("damageName");
	let value = interaction.fields.getTextInputValue("damageValue");
	if (!interaction.guild) throw new Error(ul("error.noGuild"));
	if (!interaction.message) throw new Error(ul("error.noMessage"));

	const oldDiceEmbeds = getEmbeds(
		ul,
		interaction.message ?? undefined,
		"damage"
	)?.toJSON();
	const diceEmbed = oldDiceEmbeds
		? new Djs.EmbedBuilder(oldDiceEmbeds)
		: createDiceEmbed(ul);
	if (oldDiceEmbeds?.fields)
		for (const field of oldDiceEmbeds.fields) {
			//add fields only if not already in the diceEmbed
			if (
				diceEmbed
					.toJSON()
					.fields?.findIndex((f) => f.name.unidecode() === field.name.unidecode()) === -1
			) {
				diceEmbed.addFields(field);
			}
		}
	const user = getUserByEmbed(interaction.message, ul, first);
	if (!user) throw new Error(ul("error.user")); //mean that there is no embed
	value = evalStatsDice(value, user.stats);

	if (
		diceEmbed
			.toJSON()
			.fields?.findIndex((f) => f.name.unidecode() === name.unidecode()) === -1 ||
		!diceEmbed.toJSON().fields
	) {
		diceEmbed.addFields({
			name: name.capitalize(),
			value: `\`${value}\``,
			inline: true,
		});
	}
	const damageName = diceEmbed.toJSON().fields?.reduce(
		(acc, field) => {
			acc[field.name] = field.value.removeBacktick();
			return acc;
		},
		{} as { [name: string]: string }
	);
	if (damageName && Object.keys(damageName).length > 25) {
		await reply(interaction, { content: ul("modals.dice.max"), ephemeral: true });
		return;
	}
	const { userID, userName } = await getUserNameAndChar(interaction, ul, first);
	await addAutoRole(
		interaction,
		userID,
		!!damageName && Object.keys(damageName).length > 0,
		false,
		db
	);
	if (!first) {
		const userEmbed = getEmbeds(ul, interaction.message ?? undefined, "user");
		if (!userEmbed) throw new NoEmbed(); //mean that there is no embed
		const statsEmbed = getEmbeds(ul, interaction.message ?? undefined, "stats");
		const templateEmbed = getEmbeds(ul, interaction.message ?? undefined, "template");
		const allEmbeds = [userEmbed];
		if (statsEmbed) allEmbeds.push(statsEmbed);
		allEmbeds.push(diceEmbed);
		if (templateEmbed) allEmbeds.push(templateEmbed);
		const components = editUserButtons(ul, !!statsEmbed, true);

		const userRegister: {
			userID: string;
			charName: string | undefined;
			damage: string[] | undefined;
			msgId: UserMessageId;
		} = {
			userID,
			charName: userName,
			damage: damageName ? Object.keys(damageName) : undefined,
			msgId: [interaction.message.id, interaction.message.channel.id],
		};
		await registerUser(userRegister, interaction, db, false);
		await interaction?.message?.edit({ embeds: allEmbeds, components: [components] });
		await reply(interaction, { content: ul("modals.added.dice"), ephemeral: true });
		await sendLogs(
			ul("logs.dice.add", {
				user: Djs.userMention(interaction.user.id),
				fiche: interaction.message.url,
				char: `${Djs.userMention(userID)} ${userName ? `(${userName})` : ""}`,
			}),
			interaction.guild as Djs.Guild,
			db
		);
		return;
	}

	const components = registerDmgButton(ul);
	const userEmbed = getEmbeds(ul, interaction.message ?? undefined, "user");
	if (!userEmbed) throw new NoEmbed(); //mean that there is no embed
	const statsEmbed = getEmbeds(ul, interaction.message ?? undefined, "stats");
	const allEmbeds = [userEmbed];
	if (statsEmbed) allEmbeds.push(statsEmbed);
	allEmbeds.push(diceEmbed);
	await interaction?.message?.edit({ embeds: allEmbeds, components: [components] });
	await reply(interaction, { content: ul("modals.added.dice"), ephemeral: true });

	await sendLogs(
		ul("logs.dice.add", {
			user: Djs.userMention(interaction.user.id),
			fiche: interaction.message.url,
			char: `${Djs.userMention(userID)} ${userName ? `(${userName})` : ""}`,
		}),
		interaction.guild as Djs.Guild,
		db
	);
	return;
}

/**
 * Validate the edit of the dice from the modals
 * Will parse the dice and validate if they are correct
 * Edit the embed with the new dice or remove it if it's empty
 * @param interaction {Djs.ModalSubmitInteraction}
 * @param ul {Translation}
 * @param db
 */
export async function validateDiceEdit(
	interaction: Djs.ModalSubmitInteraction,
	ul: Translation,
	db: Settings
) {
	if (!interaction.message) return;
	const diceEmbeds = getEmbeds(ul, interaction?.message ?? undefined, "damage");
	if (!diceEmbeds) return;
	const values = interaction.fields.getTextInputValue("allDice");
	const valuesAsDice = values.split("\n- ").map((dice) => {
		const [name, value] = dice.split(/ ?: ?/);
		return { name: name.replace(/^- /, "").trim().toLowerCase(), value };
	});
	const dices = valuesAsDice.reduce(
		(acc, { name, value }) => {
			acc[name] = value;
			return acc;
		},
		{} as { [name: string]: string }
	);
	const newEmbedDice: Djs.APIEmbedField[] = [];
	for (const [skill, dice] of Object.entries(dices)) {
		//test if dice is valid
		if (newEmbedDice.find((field) => field.name.unidecode() === skill.unidecode()))
			continue;
		if (dice === "X" || dice.trim().length === 0 || dice === "0") {
			newEmbedDice.push({
				name: skill.capitalize(),
				value: "X",
				inline: true,
			});
			continue;
		}
		const statsEmbeds = getEmbeds(ul, interaction?.message ?? undefined, "stats");
		if (!statsEmbeds) {
			if (!roll(dice)) {
				throw new Error(ul("error.invalidDice.withDice", { dice }));
			}
			continue;
		}
		const statsValues = parseStatsString(statsEmbeds);
		try {
			evalStatsDice(dice, statsValues);
		} catch (error) {
			throw new Error(ul("error.invalidDice.withDice", { dice }));
		}
		newEmbedDice.push({
			name: skill.capitalize(),
			value: `\`${dice}\``,
			inline: true,
		});
	}
	const oldDice = diceEmbeds.toJSON().fields;
	if (oldDice) {
		for (const field of oldDice) {
			const name = field.name.toLowerCase();
			if (!newEmbedDice.find((field) => field.name.unidecode() === name.unidecode())) {
				//register the old value
				newEmbedDice.push({
					name: name.capitalize(),
					value: `${field.value}`,
					inline: true,
				});
			}
		}
	}
	//remove duplicate
	const fieldsToAppend: Djs.APIEmbedField[] = [];
	for (const field of newEmbedDice) {
		const name = field.name.toLowerCase();
		const dice = field.value;
		if (
			fieldsToAppend.find((f) => f.name.unidecode() === name.unidecode()) ||
			dice.toLowerCase() === "x" ||
			dice.trim().length === 0 ||
			dice === "0"
		)
			continue;
		fieldsToAppend.push(field);
	}
	const diceEmbed = createDiceEmbed(ul).addFields(fieldsToAppend);
	const { userID, userName } = await getUserNameAndChar(interaction, ul);
	const messageID = [
		interaction.message.id,
		interaction.message.channelId,
	] as UserMessageId;
	if (!fieldsToAppend || fieldsToAppend.length === 0) {
		//dice was removed
		const embedsList = getEmbedsList(
			ul,
			{ which: "damage", embed: diceEmbed },
			interaction.message
		);
		const toAdd = removeEmbedsFromList(embedsList.list, "damage");
		const components = editUserButtons(ul, embedsList.exists.stats, false);
		await interaction.message.edit({ embeds: toAdd, components: [components] });
		await reply(interaction, { content: ul("modals.removed.dice"), ephemeral: true });

		const userRegister: UserRegistration = {
			userID,
			charName: userName,
			damage: undefined,
			msgId: messageID,
		};
		registerUser(userRegister, interaction, db, false);
		await sendLogs(
			ul("logs.dice.remove", {
				user: Djs.userMention(interaction.user.id),
				fiche: interaction.message.url,
				char: `${Djs.userMention(userID)} ${userName ? `(${userName})` : ""}`,
			}),
			interaction.guild as Djs.Guild,
			db
		);
		return;
	}
	const skillDiceName = Object.keys(
		fieldsToAppend.reduce(
			(acc, field) => {
				acc[field.name] = field.value;
				return acc;
			},
			{} as { [name: string]: string }
		)
	);
	const userRegister = {
		userID,
		charName: userName,
		damage: skillDiceName,
		msgId: messageID,
	};
	registerUser(userRegister, interaction, db, false);
	const embedsList = getEmbedsList(
		ul,
		{ which: "damage", embed: diceEmbed },
		interaction.message
	);
	await interaction.message.edit({ embeds: embedsList.list });
	await reply(interaction, { content: ul("embed.edit.dice"), ephemeral: true });
	const compare = displayOldAndNewStats(diceEmbeds.toJSON().fields, fieldsToAppend);
	const logMessage = ul("logs.dice.edit", {
		user: Djs.userMention(interaction.user.id),
		fiche: interaction.message.url,
		char: `${Djs.userMention(userID)} ${userName ? `(${userName})` : ""}`,
	});
	await sendLogs(`${logMessage}\n${compare}`, interaction.guild as Djs.Guild, db);
}
