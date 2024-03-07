import {
	channelMention,
	CommandInteraction,
	CommandInteractionOptionResolver,
	ForumChannel,
	InteractionResponse,
	Locale,
	Message,
	SlashCommandBuilder,
	TextChannel,
	userMention} from "discord.js";
import moment from "moment";
import dedent from "ts-dedent";

import { cmdLn, ln } from "../localizations";
import en from "../localizations/locales/en";
import fr from "../localizations/locales/fr";
import { rollWithInteraction , setTagsForRoll } from "../utils";
import { commands } from "./register";


const TRANSLATION = {
	fr,
	en
};

export function deleteAfter(message: InteractionResponse | Message, time: number): void {
	setTimeout(() => {
		message.delete();
	}, time);
}

export const diceRoll = {
	data: new SlashCommandBuilder()
		.setName(en.roll.name)
		.setNameLocalizations(cmdLn("roll.name"))
		.setDescription(en.roll.description)
		.setDescriptionLocalizations(cmdLn("roll.description"))
		.addStringOption(option =>
			option
				.setName(en.roll.option.name)
				.setNameLocalizations(cmdLn("roll.option.name"))
				.setDescription(en.roll.option.description)
				.setDescriptionLocalizations(cmdLn("roll.option.description"))
				.setRequired(true)
		),
	async execute(interaction: CommandInteraction): Promise<void> {
		if (!interaction.guild) return;
		const channel = interaction.channel;
		const userLang = TRANSLATION[interaction.locale as keyof typeof TRANSLATION] || TRANSLATION.en;
		if (!channel || !channel.isTextBased()) return;
		const option = interaction.options as CommandInteractionOptionResolver;
		const dice = option.getString(en.roll.option.name);
		if (!dice) {
			await interaction.reply({ content: userLang.roll.noDice, ephemeral: true });
			return;
		}
		try {
			await rollWithInteraction(interaction, dice, channel);
		} catch (error) {
			await interaction.reply({ content: userLang.roll.noValidDice, ephemeral: true });
			return;
		}
	},
};

export const newScene = {
	data : new SlashCommandBuilder()
		.setName(en.scene.name)
		.setDescription(en.scene.description)
		.setDescriptionLocalizations(cmdLn("scene.description"))
		.setNameLocalizations(cmdLn("scene.name"))
		.addStringOption(option =>
			option
				.setName(en.scene.option.name)
				.setNameLocalizations(cmdLn("scene.option.name"))
				.setDescription(en.scene.option.description)
				.setDescriptionLocalizations(cmdLn("scene.option.description"))
				.setRequired(false)
		)
		.addBooleanOption(option =>
			option
				.setName(en.scene.time.name)
				.setNameLocalizations(cmdLn("scene.time.name"))
				.setDescription(en.scene.time.description)
				.setDescriptionLocalizations(cmdLn("scene.time.description"))
				.setRequired(false)
		),
	async execute(interaction: CommandInteraction): Promise<void> {
		if (!interaction.guild) return;
		const allCommands = await interaction.guild.commands.fetch();
		const channel = interaction.channel;
		if (!channel || channel.isDMBased() || !channel.isTextBased()) return;

		const option = interaction.options as CommandInteractionOptionResolver;
		const userLang = ln(interaction.locale as Locale);
		const scene = option.getString(en.scene.option.name);
		const bubble = option.getBoolean(en.scene.time.name);
		if (!scene && !bubble) {
			await interaction.reply({ content: userLang.scene.noScene, ephemeral: true });
			return;
		}
		//archive old threads
		if (channel instanceof TextChannel || channel.parent instanceof ForumChannel || !channel.name.startsWith("🎲")) {
			const threads = channel instanceof TextChannel ? channel.threads.cache.filter(thread => thread.name.startsWith("🎲") && !thread.archived) : (channel.parent as ForumChannel).threads.cache.filter(thread => thread.name === `🎲 ${scene}`&& !thread.archived);
			for (const thread of threads) {
				await thread[1].setArchived(true);
			}
			let threadName = "";
			if (bubble) {
				threadName = scene ? ` ⏲️ ${scene}` : ` ⏲️ ${moment().format("DD-MM-YYYY")}`;
			} else threadName = `🎲 ${scene}`;

			if (threadName.includes("{{date}}"))
				threadName = threadName.replace("{{date}}", moment().format("DD-MM-YYYY"));

			const newThread = channel instanceof TextChannel ? await channel.threads.create({
				name: threadName,
				reason: userLang.scene.reason,
			}) : await (channel.parent as ForumChannel).threads.create({
				name: threadName,
				message: {content: userLang.scene.reason},
				appliedTags: [(await setTagsForRoll(channel.parent as ForumChannel)).id as string]
			});

			const threadMention = channelMention(newThread.id);
			const reply = await interaction.reply({ content: userLang.scene.interaction(threadMention) });
			deleteAfter(reply, 180000);
			const rollID = allCommands.findKey(command => command.name === "roll");
			const msgToEdit = await newThread.send("_ _");
			const msg = `${userMention(interaction.user.id)} - <t:${moment().unix()}:R>\n${userLang.scene.underscore} ${scene}\n*roll: </roll:${rollID}>*`;
			await msgToEdit.edit(msg);
		}
		return;
	}
};

export const help = {
	data: new SlashCommandBuilder()
		.setName(en.help.name)
		.setNameLocalizations(cmdLn("help.name"))
		.setDescription(en.help.description)
		.setDescriptionLocalizations(cmdLn("help.description")),
	async execute(interaction: CommandInteraction): Promise<void> {
		const commandsID = await interaction.guild?.commands.fetch();
		if (!commandsID) return;
		const rollID = commandsID.findKey(command => command.name === "roll");
		const sceneID = commandsID.findKey(command => command.name === "scene");

		const message = ln(interaction.locale as Locale).help.message(rollID as string, sceneID as string);
		const reply = await interaction.reply({ content: dedent(message)});
		deleteAfter(reply, 60000);
		return;
	}

};
//@ts-ignore
export const commandsList = [diceRoll, newScene, help].concat(commands);
