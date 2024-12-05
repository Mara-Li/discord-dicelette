import type { UserData } from "@dicelette:types/database";
import { NoEmbed } from "@dicelette:utils/errors";
import type { StatisticalTemplate } from "@dicelette/core";
import { ln } from "@dicelette/localization";
import type { Settings, Translation } from "@dicelette/types";
import { logger } from "@dicelette/utils";
import { showStatistiqueModal } from "buttons/statistics";
import * as Djs from "discord.js";
import {
	createDiceEmbed,
	createEmbedsList,
	createStatsEmbed,
	createTemplateEmbed,
	createUserEmbed,
	embedError,
	getEmbeds,
	parseEmbedFields,
} from "messages/embeds";
import { reply } from "messages/send";
import { repostInThread } from "messages/thread";
import { addAutoRole } from "utils";

export async function startRegisterUser(
	interaction: Djs.ButtonInteraction,
	template: StatisticalTemplate,
	interactionUser: Djs.User,
	ul: Translation,
	havePrivate?: boolean
) {
	const isModerator = interaction.guild?.members.cache
		.get(interactionUser.id)
		?.permissions.has(Djs.PermissionsBitField.Flags.ManageRoles);
	if (isModerator) await showFirstPageModal(interaction, template, ul, havePrivate);
	else await reply(interaction, { content: ul("modals.noPermission"), ephemeral: true });
}
/**
 * Modal opened to register a new user with the name of the character and the user id
 */
export async function showFirstPageModal(
	interaction: Djs.ButtonInteraction,
	template: StatisticalTemplate,
	ul: Translation,
	havePrivate?: boolean
) {
	let nbOfPages = 1;
	if (template.statistics) {
		const nbOfStatistique = Object.keys(template.statistics).length;
		nbOfPages = Math.ceil(nbOfStatistique / 5) > 0 ? Math.ceil(nbOfStatistique / 5) : 2;
	}

	const modal = new Djs.ModalBuilder()
		.setCustomId("firstPage")
		.setTitle(ul("modals.firstPage", { page: nbOfPages + 1 }));
	const charNameInput =
		new Djs.ActionRowBuilder<Djs.ModalActionRowComponentBuilder>().addComponents(
			new Djs.TextInputBuilder()
				.setCustomId("charName")
				.setLabel(ul("modals.charName.name"))
				.setPlaceholder(ul("modals.charName.description"))
				.setRequired(template.charName || false)
				.setValue("")
				.setStyle(Djs.TextInputStyle.Short)
		);
	const userIdInputs =
		new Djs.ActionRowBuilder<Djs.ModalActionRowComponentBuilder>().addComponents(
			new Djs.TextInputBuilder()
				.setCustomId("userID")
				.setLabel(ul("modals.user.name"))
				.setPlaceholder(ul("modals.user.description"))
				.setRequired(true)
				.setValue(interaction.user.username ?? interaction.user.id)
				.setStyle(Djs.TextInputStyle.Short)
		);
	const avatarInputs =
		new Djs.ActionRowBuilder<Djs.ModalActionRowComponentBuilder>().addComponents(
			new Djs.TextInputBuilder()
				.setCustomId("avatar")
				.setLabel(ul("modals.avatar.name"))
				.setPlaceholder(ul("modals.avatar.description"))
				.setRequired(false)
				.setValue("")
				.setStyle(Djs.TextInputStyle.Short)
		);
	const channelIdInput =
		new Djs.ActionRowBuilder<Djs.ModalActionRowComponentBuilder>().addComponents(
			new Djs.TextInputBuilder()
				.setCustomId("channelId")
				.setLabel(ul("modals.channel.name"))
				.setPlaceholder(ul("modals.channel.description"))
				.setRequired(false)
				.setValue("")
				.setStyle(Djs.TextInputStyle.Short)
		);
	const components = [charNameInput, userIdInputs, avatarInputs, channelIdInput];
	if (havePrivate) {
		const privateInput =
			new Djs.ActionRowBuilder<Djs.ModalActionRowComponentBuilder>().addComponents(
				new Djs.TextInputBuilder()
					.setCustomId("private")
					.setLabel(ul("modals.private.name"))
					.setPlaceholder(ul("modals.private.description"))
					.setRequired(false)
					.setValue("")
					.setStyle(Djs.TextInputStyle.Short)
			);
		components.push(privateInput);
	}
	modal.addComponents(components);
	await interaction.showModal(modal);
}

/**
 * Interaction to continue to the next page of the statistics when registering a new user
 */
export async function continuePage(
	interaction: Djs.ButtonInteraction,
	dbTemplate: StatisticalTemplate,
	ul: Translation,
	interactionUser: Djs.User
) {
	const isModerator = interaction.guild?.members.cache
		.get(interactionUser.id)
		?.permissions.has(Djs.PermissionsBitField.Flags.ManageRoles);
	if (!isModerator) {
		await reply(interaction, { content: ul("modals.noPermission"), ephemeral: true });
		return;
	}
	const page = Number.isNaN(Number.parseInt(interaction.customId.replace("page", ""), 10))
		? 1
		: Number.parseInt(interaction.customId.replace("page", ""), 10);
	const embed = getEmbeds(ul, interaction.message, "user");
	if (!embed || !dbTemplate.statistics) return;
	const statsEmbed = getEmbeds(ul, interaction.message, "stats") ?? createStatsEmbed(ul);
	const allTemplateStat = Object.keys(dbTemplate.statistics).map((stat) =>
		stat.unidecode()
	);

	const statsAlreadySet = Object.keys(parseEmbedFields(statsEmbed.toJSON() as Djs.Embed))
		.filter((stat) => allTemplateStat.includes(stat.unidecode()))
		.map((stat) => stat.unidecode());
	if (statsAlreadySet.length === allTemplateStat.length) {
		await reply(interaction, { content: ul("modals.alreadySet"), ephemeral: true });
		return;
	}
	await showStatistiqueModal(interaction, dbTemplate, statsAlreadySet, page + 1);
}

/**
 * Validate the user and create the embeds when the button is clicked
 */

export async function validateUserButton(
	interaction: Djs.ButtonInteraction,
	interactionUser: Djs.User,
	template: StatisticalTemplate,
	ul: Translation,
	db: Settings
) {
	const isModerator = interaction.guild?.members.cache
		.get(interactionUser.id)
		?.permissions.has(Djs.PermissionsBitField.Flags.ManageRoles);
	if (isModerator) await validateUser(interaction, template, db);
	else await reply(interaction, { content: ul("modals.noPermission"), ephemeral: true });
}

/**
 * Validate the user and create the embeds
 * It will register the final embeds and send it in the thread
 */
export async function validateUser(
	interaction: Djs.ButtonInteraction,
	template: StatisticalTemplate,
	db: Settings
) {
	const lang = db.get(interaction.guild!.id, "lang") ?? interaction.locale;
	const ul = ln(lang);
	const userEmbed = getEmbeds(ul, interaction.message, "user");
	if (!userEmbed) throw new NoEmbed();
	const oldEmbedsFields = parseEmbedFields(userEmbed.toJSON() as Djs.Embed);
	let userID = oldEmbedsFields?.["common.user"];
	let charName: string | undefined = oldEmbedsFields?.["common.charName"];
	const isPrivate = oldEmbedsFields["common.isPrivate"] === "common.yes";
	const channelToPost = oldEmbedsFields?.["common.channel"];
	if (channelToPost) {
		const channel = await interaction.guild?.channels.fetch(
			channelToPost.replace("<#", "").replace(">", "")
		);
		if (!channel) {
			await reply(interaction, {
				embeds: [embedError(ul("error.channel", { channel: channelToPost }), ul)],
				ephemeral: true,
			});
			return;
		}
	}
	if (charName && charName === "common.noSet") charName = undefined;
	if (!userID) {
		await reply(interaction, {
			embeds: [embedError(ul("error.user"), ul)],
			ephemeral: true,
		});
		return;
	}
	userID = userID.replace("<@", "").replace(">", "");
	const userDataEmbed = createUserEmbed(
		ul,
		userEmbed.toJSON().thumbnail?.url || "",
		userID,
		charName
	);
	const oldDiceEmbeds = getEmbeds(ul, interaction.message, "damage");
	const oldStatsEmbed = getEmbeds(ul, interaction.message, "stats");
	const oldDiceEmbedsFields = oldDiceEmbeds ? (oldDiceEmbeds.toJSON().fields ?? []) : [];
	const statEmbedsFields = oldStatsEmbed ? (oldStatsEmbed.toJSON().fields ?? []) : [];
	let diceEmbed: Djs.EmbedBuilder | undefined = undefined;
	let statsEmbed: Djs.EmbedBuilder | undefined = undefined;
	for (const field of oldDiceEmbedsFields) {
		if (!diceEmbed) {
			diceEmbed = createDiceEmbed(ul);
		}
		diceEmbed.addFields({
			name: field.name.unidecode(true).capitalize(),
			value: `\`${field.value}\``,
			inline: true,
		});
	}
	for (const field of statEmbedsFields) {
		if (!statsEmbed) {
			statsEmbed = createStatsEmbed(ul);
		}
		statsEmbed.addFields({
			name: field.name.unidecode(true).capitalize(),
			value: field.value,
			inline: true,
		});
	}

	const templateStat = template.statistics ? Object.keys(template.statistics) : [];
	const parsedStats = statsEmbed
		? parseEmbedFields(statsEmbed.toJSON() as Djs.Embed)
		: undefined;
	const stats: { [name: string]: number } = {};
	if (parsedStats)
		for (const stat of templateStat) {
			stats[stat] = Number.parseInt(parsedStats[stat.unidecode()], 10);
		}

	const damageFields = diceEmbed?.toJSON().fields ?? [];
	let templateDamage: { [name: string]: string } | undefined = undefined;

	if (damageFields.length > 0) {
		templateDamage = {};

		for (const damage of damageFields) {
			templateDamage[damage.name.unidecode()] = damage.value;
		}
	}
	for (const [name, dice] of Object.entries(template.damage ?? {})) {
		if (!templateDamage) templateDamage = {};
		templateDamage[name] = dice;
		if (!diceEmbed) {
			diceEmbed = createDiceEmbed(ul);
		}
		//why i forgot this????
		diceEmbed.addFields({
			name: `${name}`,
			value: `\`${dice}\``,
			inline: true,
		});
	}
	const userStatistique: UserData = {
		userName: charName,
		stats,
		template: {
			diceType: template.diceType,
			critical: template.critical,
		},
		damage: templateDamage,
		private: isPrivate,
		avatar: userEmbed.toJSON().thumbnail?.url,
	};
	let templateEmbed: Djs.EmbedBuilder | undefined = undefined;
	if (template.diceType || template.critical) {
		templateEmbed = createTemplateEmbed(ul);
		if (template.diceType)
			templateEmbed.addFields({
				name: ul("common.dice").capitalize(),
				value: `\`${template.diceType}\``,
				inline: true,
			});
		if (template.critical?.success) {
			templateEmbed.addFields({
				name: ul("roll.critical.success"),
				value: `\`${template.critical.success}\``,
				inline: true,
			});
		}
		if (template.critical?.failure) {
			templateEmbed.addFields({
				name: ul("roll.critical.failure"),
				value: `\`${template.critical.failure}\``,
				inline: true,
			});
		}
	}
	const allEmbeds = createEmbedsList(userDataEmbed, statsEmbed, diceEmbed, templateEmbed);
	await repostInThread(
		allEmbeds,
		interaction,
		userStatistique,
		userID,
		ul,
		{ stats: !!statsEmbed, dice: !!diceEmbed, template: !!templateEmbed },
		db,
		channelToPost.replace("<#", "").replace(">", "")
	);
	try {
		await interaction.message.delete();
	} catch (e) {
		logger.warn(e, "validateUser: can't delete the message");
	}
	await addAutoRole(interaction, userID, !!statsEmbed, !!diceEmbed, db);
	await reply(interaction, { content: ul("modals.finished"), ephemeral: true });
	return;
}
