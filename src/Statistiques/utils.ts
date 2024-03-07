/* eslint-disable @typescript-eslint/no-unused-vars */

import { ActionRowBuilder, AutocompleteInteraction, BaseInteraction, ButtonBuilder, ButtonInteraction, ButtonStyle, CommandInteraction, EmbedBuilder, ForumChannel, Guild, Locale, ModalActionRowComponentBuilder, ModalBuilder, ModalSubmitInteraction, TextBasedChannel, TextChannel, TextInputBuilder, TextInputStyle, ThreadChannel, userMention } from "discord.js";
import fs from "fs";
import {evaluate} from "mathjs";
import moment from "moment";
import removeAccents from "remove-accents";
import { ln } from "src/localizations";

import { deleteAfter } from "../commands";
import { parseResult, roll } from "../dice";
import { DETECT_DICE_MESSAGE } from "../events/message_create";
import { GuildData, StatistiqueTemplate, User } from "../interface";
import en from "../localizations/locales/en";
import fr from "../localizations/locales/fr";
import { findForumChannel, findThread } from "../utils";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function verifyTemplateValue(template: any, interaction: BaseInteraction): StatistiqueTemplate {
	const ul = ln(interaction.locale as Locale);
	const statistiqueTemplate: StatistiqueTemplate = {
		statistiques: {},
		diceType: "",
		comparator: {
			sign: ">",
			value: 0,
			formula: "",
		},
	};
	if (template.statistiques) {
		for (const [key, value] of Object.entries(template.statistiques)) {
			const dataValue = value as { max?: number, min?: number, combinaison?: string };
			const statName = removeAccents(key).toLowerCase();
			if (dataValue.max && dataValue.min && dataValue.max <= dataValue.min)
				throw new Error("Max must be greater than min");
			if (dataValue.max && dataValue.max <= 0 ) dataValue.max = undefined;
			if (dataValue.min && dataValue.min <= 0 ) dataValue.min = undefined;
			const formula = dataValue.combinaison ? removeAccents(dataValue.combinaison).toLowerCase() : undefined;
			statistiqueTemplate.statistiques[statName] = {
				max: dataValue.max,
				min: dataValue.min,
				combinaison: formula || undefined,
			};
		}
	}
	if (template.diceType) {
		//verify is dice is valid using API
		try {
			roll(template.diceType);
			statistiqueTemplate.diceType = template.diceType;
		} catch (e) {
			throw new Error(ul.error.invalidDice);
		}
	}

	if (!template.comparator)
		throw new Error(ul.error.invalidComparator);
	if (template.comparator) {
		if (!template.comparator.sign.match(/(>|<|>=|<=|=|!=)/))
			throw new Error(ul.error.incorrectSign);
		if (template.comparator.value <= 0)
			template.comparator.value = undefined;
		if (template.comparator.formula){
			template.comparator.formula = removeAccents(template.comparator.formula);
		
		}

		if (template.comparator.criticalSuccess && template.comparator.criticalSuccess<=0) template.comparator.criticalSuccess = undefined;
		if (template.comparator.criticalFailure && template.comparator.criticalFailure<=0) template.comparator.criticalFailure = undefined;
		statistiqueTemplate.comparator = template.comparator;
	}
	if (template.total) {
		if (template.total <= 0)
			template.total = undefined;
		statistiqueTemplate.total = template.total;
	}
	if (template.charName) statistiqueTemplate.charName = template.charName;

	try {
		testFormula(statistiqueTemplate, interaction);
		testCombinaison(statistiqueTemplate, interaction);
	} catch (error) {
		throw new Error((error as Error).message);
	}

	return statistiqueTemplate;
}

function testCombinaison(template: StatistiqueTemplate, interaction: BaseInteraction) {
	const ul = ln(interaction.locale as Locale);
	const onlyCombinaisonStats = Object.fromEntries(Object.entries(template.statistiques).filter(([_, value]) => value.combinaison !== undefined));
	const allOtherStats = Object.fromEntries(Object.entries(template.statistiques).filter(([_, value]) => !value.combinaison));	
	if (Object.keys(onlyCombinaisonStats).length===0) return;
	const allStats = Object.keys(template.statistiques).filter(stat => !template.statistiques[stat].combinaison);
	if (allStats.length === 0) 
		throw new Error(ul.error.noStat);
	const error= [];
	for (const [stat, value] of Object.entries(onlyCombinaisonStats)) {
		let formula = value.combinaison as string;
		for (const [_, data] of Object.entries(allOtherStats)) {
			const {max, min} = data;
			const total = template.total || 100;
			const randomStatValue = max && min ? Math.floor(Math.random() * (max - min + 1)) + min : Math.floor(Math.random() * total);
			const regex = new RegExp(stat, "g");
			formula = formula.replace(regex, randomStatValue.toString());
		}
		try {
			evaluate(formula);
		} catch (e) {
			error.push(stat);
		}
	}
	if (error.length > 0) 
		throw new Error(`${ul.error.invalidFormula}${ul.common.space}: ${error.join(", ")}`);
	return;
}

function testFormula(template: StatistiqueTemplate, interaction: BaseInteraction) {
	const ul = ln(interaction.locale as Locale);
	const firstStatNotCombinaison = Object.keys(template.statistiques).find(stat => !template.statistiques[stat].combinaison);
	if (!firstStatNotCombinaison) 
		throw new Error(`${ul.error.noStat} : ${ul.error.onlyCombination}`);
	if (!template.comparator.formula) return;
	const stats = template.statistiques[firstStatNotCombinaison];
	const {min, max} = stats;
	const total = template.total || 100;
	
	let randomStatValue = 0;
	while (randomStatValue < total)
		if (max && min)
			randomStatValue = Math.floor(Math.random() * (max - min + 1)) + min;
		else if (max)
			randomStatValue = Math.floor(Math.random() * (max - 1)) + 1;
		else if (min)
			randomStatValue = Math.floor(Math.random() * (total - min + 1)) + min;
		else
			randomStatValue = Math.floor(Math.random() * total);
	const formula = template.comparator.formula.replace("$", randomStatValue.toString());	
	try {
		evaluate(formula);
		return true;
	} catch (error) {
		throw new Error(ul.error.invalidFormula);
	}
}

export async function getTemplate(interaction: ButtonInteraction | ModalSubmitInteraction): Promise<StatistiqueTemplate|undefined> {
	const template = interaction.message?.attachments.first();
	if (!template) return;
	const res = await fetch(template.url).then(res => res.json());
	return verifyTemplateValue(res, interaction);
}

export function getGuildData(interaction: CommandInteraction | ButtonInteraction | ModalSubmitInteraction|AutocompleteInteraction): GuildData|undefined {
	if (!interaction.guild) return;
	const guildData = interaction.guild.id;
	const data = fs.readFileSync("database.json", "utf-8");
	const parsedData = JSON.parse(data);
	if (!parsedData[guildData]) return;
	return parsedData[guildData] as GuildData;
}

export async function getTemplateWithDB(interaction: ButtonInteraction | ModalSubmitInteraction) {
	if (!interaction.guild) return;
	const guild = interaction.guild;
	const guildData = getGuildData(interaction);
	if (!guildData) return;
	const {channelId, messageId} = guildData.templateID;
	const channel = await guild.channels.fetch(channelId);
	if (!channel || !(channel instanceof TextChannel)) return;
	const message = await channel.messages.fetch(messageId);
	if (!message) return;
	const template = message.attachments.first();
	if (!template) return;
	const res = await fetch(template.url).then(res => res.json());
	return verifyTemplateValue(res, interaction);

}

export function getUserData(guildData: GuildData, userId: string) {
	if (!guildData.user) return undefined;
	return guildData.user[userId];
}

export function getStatistiqueFields(interaction: ModalSubmitInteraction, templateData: StatistiqueTemplate) {
	const ul = ln(interaction.locale as Locale);
	const combinaisonFields: {[name: string]: string} = {};
	const stats: { [name: string]: number } = {};
	let total = templateData.total;
	for (const [key, value] of Object.entries(templateData.statistiques)) {
		const name = removeAccents(key).toLowerCase();
		if (value.combinaison) {
			combinaisonFields[name] = value.combinaison;
			continue;
		}
		const statValue = interaction.fields.getTextInputValue(name);
		if (!statValue) continue;
		const num = parseInt(statValue);
		if (value.min && num < value.min) {
			throw new Error(ul.error.mustBeGreater(name, value.min));
		} else if (value.max && num > value.max) {
			throw new Error(ul.error.mustBeLower(name, value.max));
		}
		if (total) {
			total -= num;
			if (total < 0) {
				const exceeded = total * -1;
				throw new Error(ul.error.totalExceededBy(name, exceeded));
			} else stats[name] = num;
		} else stats[name] = num;
	}
	return { combinaisonFields, stats };
}

export function parseEmbed(interaction: ButtonInteraction | ModalSubmitInteraction) {
	const embed = interaction.message?.embeds[0];
	if (!embed) return;
	const fields = embed.fields;
	const parsedFields: {[name: string]: string} = {};
	for (const field of fields) {
		parsedFields[field.name] = field.value;
	}
	return parsedFields;
}

export async function createEmbedFirstPage(interaction: ModalSubmitInteraction) {
	const ul = ln(interaction.locale as Locale);
	const channel = interaction.channel;
	if (!channel) return;
	const userFromField = interaction.fields.getTextInputValue("userID");
	const user = interaction.guild?.members.cache.find(member => member.id === userFromField || member.user.username === userFromField.toLowerCase());
	if (!user)
		throw new Error(ul.error.user);
	const charName = interaction.fields.getTextInputValue("charName");
	const embed = new EmbedBuilder()
		.setTitle("Registering User")
		.setThumbnail(user.user.displayAvatarURL())
		.setFooter({ text: "Page 1" })
		.addFields(
			{ name: "Character name", value: charName.length > 0 ? charName : "Not set", inline: true},
			{ name: "User", value: userMention(user.id), inline: true},
			{name: "\u200B", value: "_ _", inline: true}
		);
	//add continue button
	const continueButton = new ButtonBuilder()
		.setCustomId("continue")
		.setLabel("Continue")
		.setStyle(ButtonStyle.Success);
	const cancelButton = new ButtonBuilder()
		.setCustomId("cancel")
		.setLabel("Cancel")
		.setStyle(ButtonStyle.Danger);
	await interaction.reply({ embeds: [embed], components: [new ActionRowBuilder<ButtonBuilder>().addComponents([continueButton, cancelButton])] });
}

export async function showFistPageModal(interaction: ButtonInteraction, template: StatistiqueTemplate) {
	const nbOfStatistique = Object.keys(template.statistiques).length;
	const nbOfPages = Math.floor(nbOfStatistique / 5) > 0 ? Math.floor(nbOfStatistique / 5) : 2;
	const modal = new ModalBuilder()
		.setCustomId("firstPage")
		.setTitle(`Registering User - Page 1/${nbOfPages}`);
	const charNameInput = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
		new TextInputBuilder()
			.setCustomId("charName")
			.setLabel("Character name")
			.setPlaceholder("Enter your character name")
			.setRequired(template.charName || false)
			.setValue("")
			.setStyle(TextInputStyle.Short),
	);
	const userIdInputs = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
		new TextInputBuilder()
			.setCustomId("userID")
			.setLabel("User")
			.setPlaceholder("Enter the user rattached to the character (id or global username)")
			.setRequired(true)
			.setValue("")
			.setStyle(TextInputStyle.Short),
	);
	modal.addComponents(charNameInput, userIdInputs);	
	await interaction.showModal(modal);

}

export async function showStatistiqueModal(interaction: ButtonInteraction, template: StatistiqueTemplate, stats?: string[], page = 1) {
	const modal = new ModalBuilder()
		.setCustomId(`page${page}`)
		.setTitle(`Registering User - Page ${page}/${Math.ceil(Object.keys(template.statistiques).length / 5)}`);
	let statToDisplay = Object.keys(template.statistiques);
	if (stats && stats.length > 0) {
		statToDisplay = statToDisplay.filter(stat => !stats.includes(stat));
		if (statToDisplay.length === 0) {
			await interaction.reply({ content: "All stats are already set", ephemeral: true });
			return;
		}
	}
	//take 5 stats
	const statsToDisplay = statToDisplay.slice(0, 4);
	for (const stat of statsToDisplay) {
		const value = template.statistiques[stat];
		if (value.combinaison) continue;
		const input = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
			new TextInputBuilder()
				.setCustomId(stat)
				.setLabel(stat)
				.setPlaceholder("Enter the value")
				.setRequired(true)
				.setValue("")
				.setStyle(TextInputStyle.Short),
		);
		modal.addComponents(input);
	}
	await interaction.showModal(modal);
}

export function title(str: string) {
	return str.charAt(0).toUpperCase() + str.slice(1);
}

export async function embedStatistiques(interaction: ModalSubmitInteraction, template: StatistiqueTemplate, page=2) {
	if (!interaction.message) return;
	const oldEmbeds = interaction.message?.embeds[0];
	if (!oldEmbeds) return;
	try {
		const {combinaisonFields, stats} = getStatistiqueFields(interaction, template);
		//combine all embeds as one
		

		//add stats to the old embed
		const embed = new EmbedBuilder()
			.setTitle("Registering User")
			.setThumbnail(oldEmbeds.thumbnail?.url || "")
			.setFooter({ text: `Page ${page}` });
		//add old fields
		if (!oldEmbeds.fields) return;
		for (const field of oldEmbeds.fields) {
			embed.addFields(field);
		}	
		for (const [stat, value] of Object.entries(stats)) {
			embed.addFields({
				name: title(stat),
				value: value.toString(),
				inline: true,
			});
		}
		
		const allTemplateStat = Object.keys(template.statistiques).filter(stat => !Object.keys(combinaisonFields).includes(stat));
		const embedObject = embed.toJSON();
		const fields = embedObject.fields;
		if (!fields) return;
		const parsedFields: {[name: string]: string} = {};
		for (const field of fields) {
			parsedFields[field.name.toLowerCase()] = field.value.toLowerCase();
		}
		const embedStats = Object.keys(parsedFields).filter(stat => allTemplateStat.includes(stat));
		let combinaison:{[name: string]: number} = {};
		if (embedStats.length === allTemplateStat.length) {
			try {
				combinaison = evalCombinaison(combinaisonFields, stats);
				//add combinaison to the embed
				for (const stat of Object.keys(combinaison)) {
					embed.addFields({
						name: title(stat),
						value: combinaison[stat].toString(),
						inline: true,
					});
				}
			} catch (error) {
				await interaction.reply({ content: (error as Error).message, ephemeral: true });
				return;
			}

			let userID = oldEmbeds.fields.find(field => field.name === "User")?.value;
			let charName: string |undefined = oldEmbeds.fields.find(field => field.name === "Character name")?.value;
			if (charName && charName === "Not set")
				charName = undefined;
			if (!userID) {
				await interaction.reply({ content: "Invalid user", ephemeral: true });
				return;
			}
			userID = userID.replace("<@", "").replace(">", "");
			const userStatistique: User = {
				userName: charName,
				stats: {...stats, ...combinaison},
				template: {
					diceType: template.diceType,
					comparator: template.comparator,
				},	
			};
			await interaction.message.delete();
			await repostInThread(embed, interaction, userStatistique, userID);
			await interaction.reply({ content: "Stats finished", ephemeral: true });
			return;
		}
		const continueButton = new ButtonBuilder()
			.setCustomId("continue")
			.setLabel("Continue")
			.setStyle(ButtonStyle.Success);
		const cancelButton = new ButtonBuilder()
			.setCustomId("cancel")
			.setLabel("Cancel")
			.setStyle(ButtonStyle.Danger);
		await interaction.message.edit({ embeds: [embed], components: [new ActionRowBuilder<ButtonBuilder>().addComponents([continueButton, cancelButton])] });
		await interaction.reply({ content: "Stats added", ephemeral: true });
	} catch (error) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		await interaction.reply({ content: (error as any).message, ephemeral: true });
	}
}

function evalCombinaison(combinaison: {[name: string]: string}, stats: {[name: string]: number}) {
	const newStats: {[name: string]: number} = {};
	for (const [stat, combin] of Object.entries(combinaison)) {
		//replace the stats in formula
		let formula = combin;
		for (const [statName, value] of Object.entries(stats)) {
			const regex = new RegExp(statName, "g");
			formula = formula.replace(regex, value.toString());
		}
		try {
			const result = evaluate(formula);
			newStats[stat] = result;
		} catch (error) {
			throw new Error(`Invalid formula for ${stat}`);
		}
	}
	return newStats;
}

async function repostInThread(embed: EmbedBuilder, interaction: ModalSubmitInteraction, userTemplate: User, userId: string) {
	const channel = interaction.channel;
	if (!channel ||!(channel instanceof TextChannel)) return;
	let thread = channel.threads.cache.find(thread => thread.name === "📝 Registered User");
	if (!thread) {
		thread = await channel.threads.create({
			name: "📝 Registered User",
			autoArchiveDuration: 60,
		});
	}
	const msg = await thread.send({ embeds: [embed], files: [{ attachment: Buffer.from(JSON.stringify(userTemplate, null, 2), "utf-8"), name: "template.json" }] },);
	registerUser(userId, interaction, msg.id, userTemplate.userName);
}

function registerUser(userID: string, interaction: ModalSubmitInteraction,msgId: string, charName?: string, ) {
	if (!interaction.guild) return;
	const guildData = getGuildData(interaction);
	if (!guildData) return;
	if (!guildData.user) guildData.user = {};
	const user = getUserData(guildData, userID);
	if (!user) {
		guildData.user[userID].push({
			charName:charName?.toLowerCase(),
			messageId: msgId
		});
	} else {
		//search if charName already exists
		const char = user.find(char => char.charName === charName);
		if (char)
			//overwrite the message id
			char.messageId = msgId;
		else user.push({ charName, messageId: msgId });	
	}
	//update the database
	const data = fs.readFileSync("database.json", "utf-8");
	const json = JSON.parse(data);
	json[interaction.guild.id] = guildData;
	fs.writeFileSync("database.json", JSON.stringify(json, null, 2));
}

export async function getUserFromMessage(guildData: GuildData, userId: string, guild: Guild, charName?: string) {
	const userData = getUserData(guildData, userId);
	if (!userData) return;
	const user = userData.find(char => char.charName === charName);
	if (!user) return;
	const mainChannel = guildData.templateID.channelId;
	const userMessageId = user.messageId;
	const channel = await guild.channels.fetch(mainChannel);
	if (!channel || !(channel instanceof TextChannel)) {
		//clean the database
		guildData.templateID = {
			channelId: "",
			messageId: "",
			statsName: [],
		};
		const data = fs.readFileSync("database.json", "utf-8");
		const json = JSON.parse(data);
		json[guild.id] = guildData;
		fs.writeFileSync("database.json", JSON.stringify(json, null, 2));
		return;
	}
	//search thread `📝 Registered User`
	const thread = channel.threads.cache.find(thread => thread.name === "📝 Registered User");
	if (!thread) return;
	try {
		const message = await thread.messages.fetch(userMessageId);
		const attachments = message.attachments.first();
		if (!attachments) return;
		return await fetch(attachments.url).then(res => res.json()) as User;
	} catch (error) {
		const index = userData.findIndex(char => char.messageId === userMessageId);
		userData.splice(index, 1);
		//update the database
		const data = fs.readFileSync("database.json", "utf-8");
		const json = JSON.parse(data);
		guildData.user[userId] = userData;
		json[guild.id] = guildData;
		fs.writeFileSync("database.json", JSON.stringify(json, null, 2));
		return;
	}

	
}

export async function rollWithInteraction(interaction: CommandInteraction, dice: string, channel: TextBasedChannel, critical?: {failure?: number, success?: number}) {
	if (!channel || channel.isDMBased() || !channel.isTextBased()) return;
	const TRANSLATION = {
		fr,
		en
	};
	const userLang = TRANSLATION[interaction.locale as keyof typeof TRANSLATION] || TRANSLATION.en;
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