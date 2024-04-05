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

import { cmdLn, ln } from "../../localizations";
import { default as i18next } from "../../localizations/i18next";
import { reply, rollWithInteraction , setTagsForRoll } from "../../utils";

const t = i18next.getFixedT("en");

export function deleteAfter(message: InteractionResponse | Message, time: number): void {
	setTimeout(() => {
		message.delete();
	}, time);
}

export const diceRoll = {
	data: new SlashCommandBuilder()
		.setName(t("roll.name"))
		.setNameLocalizations(cmdLn("roll.name"))
		.setDescription(t("roll.description"))
		.setDescriptionLocalizations(cmdLn("roll.description"))
		.addStringOption(option =>
			option
				.setName(t("roll.option.name"))
				.setNameLocalizations(cmdLn("roll.option.name"))
				.setDescription(t("roll.option.description"))
				.setDescriptionLocalizations(cmdLn("roll.option.description"))
				.setRequired(true)
		),
	async execute(interaction: CommandInteraction): Promise<void> {
		if (!interaction.guild) return;
		const channel = interaction.channel;
		if (!channel || !channel.isTextBased()) return;
		const option = interaction.options as CommandInteractionOptionResolver;
		const ul = ln(interaction.locale as Locale);
		const dice = option.getString(t("roll.option.name"), true);
		try {
			await rollWithInteraction(interaction, dice, channel);
		} catch (error) {
			console.error("no valid dice :", dice, error);
			await reply(interaction,{ content: ul("error.invalidDice.withError", {error: (error as Error).message, dice}), ephemeral: true });
			return;
		}
	},
};

export const newScene = {
	data : new SlashCommandBuilder()
		.setName(t("scene.name"))
		.setDescription(t("scene.description"))
		.setDescriptionLocalizations(cmdLn("scene.description"))
		.setNameLocalizations(cmdLn("scene.name"))
		.addStringOption(option =>
			option
				.setName(t("scene.option.name"))
				.setNameLocalizations(cmdLn("scene.option.name"))
				.setDescription(t("scene.option.description"))
				.setDescriptionLocalizations(cmdLn("scene.option.description"))
				.setRequired(false)
		)
		.addBooleanOption(option =>
			option
				.setName(t("scene.time.name"))
				.setNameLocalizations(cmdLn("scene.time.name"))
				.setDescription(t("scene.time.description"))
				.setDescriptionLocalizations(cmdLn("scene.time.description"))
				.setRequired(false)
		),
	async execute(interaction: CommandInteraction): Promise<void> {
		if (!interaction.guild) return;
		const allCommands = await interaction.guild.commands.fetch();
		const channel = interaction.channel;
		if (!channel || channel.isDMBased() || !channel.isTextBased()) return;

		const option = interaction.options as CommandInteractionOptionResolver;
		const scene = option.getString(t("scene.option.name"));
		const bubble = option.getBoolean(t("scene.time.name"));
		const ul = ln(interaction.locale as Locale);
		if (!scene && !bubble) {
			await reply(interaction,{ content: ul("scene.noScene"), ephemeral: true });
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
				reason: ul("scene.reason"),
			}) : await (channel.parent as ForumChannel).threads.create({
				name: threadName,
				message: {content: ul("scene.reason")},
				appliedTags: [(await setTagsForRoll(channel.parent as ForumChannel)).id as string]
			});

			const threadMention = channelMention(newThread.id);
			const msgReply = await reply(interaction,{ content: ul("scene.interaction", {scene: threadMention}) });
			deleteAfter(msgReply, 180000);
			const rollID = allCommands.findKey(command => command.name === "roll");
			const msgToEdit = await newThread.send("_ _");
			const msg = `${userMention(interaction.user.id)} - <t:${moment().unix()}:R>\n${ul("scene.underscore")} ${scene}\n*roll: </roll:${rollID}>*`;
			await msgToEdit.edit(msg);
		}
		return;
	}
};

export const help = {
	data: new SlashCommandBuilder()
		.setName(t("help.name"))
		.setNameLocalizations(cmdLn("help.name"))
		.setDescription(t("help.description"))
		.setDescriptionLocalizations(cmdLn("help.description")),
	async execute(interaction: CommandInteraction): Promise<void> {
		const commandsID = await interaction.guild?.commands.fetch();
		if (!commandsID) return;
		const rollID = commandsID.findKey(command => command.name === "roll");
		const sceneID = commandsID.findKey(command => command.name === "scene");
		const ul = ln(interaction.locale as Locale);
		const message = ul("help.message", {rollId: rollID, sceneId: sceneID});
		const replyMsg = await reply(interaction,{ content: dedent(message)});
		deleteAfter(replyMsg, 60000);
		return;
	}
};


