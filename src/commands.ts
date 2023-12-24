import {
	channelMention,
	CommandInteraction,
	CommandInteractionOptionResolver,
	ForumChannel,
	InteractionResponse,
	LocaleString,
	Message,
	SlashCommandBuilder,
	TextChannel,
	ThreadChannel,
	userMention} from "discord.js";
import moment from "moment";
import dedent from "ts-dedent";

import { parseResult, roll } from "./dice";
import { DETECT_DICE_MESSAGE } from "./events/message_create";
import en from "./locales/en";
import fr from "./locales/fr";
import { findForumChannel, findThread, setTagsForRoll } from "./utils";

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
		.setNameLocalizations({ "fr": fr.roll.name })
		.setDescription(en.roll.description)
		.setDescriptionLocalizations({ "fr": fr.roll.description })
		.addStringOption(option =>
			option
				.setName(en.roll.option.name)
				.setNameLocalizations({ "fr": fr.roll.option.name })
				.setDescription(en.roll.option.description)
				.setDescriptionLocalizations({ "fr": fr.roll.option.description })
				.setRequired(true)
		),
	async execute(interaction: CommandInteraction): Promise<void> {
		if (!interaction.guild) return;
		const channel = interaction.channel;
		if (!channel || channel.isDMBased() || !channel.isTextBased()) return;
		const userLang = TRANSLATION[interaction.locale as keyof typeof TRANSLATION] || TRANSLATION.en;
		if (!channel || !channel.isTextBased()) return;
		const option = interaction.options as CommandInteractionOptionResolver;
		let dice = option.getString(en.roll.option.name);
		if (!dice) {
			await interaction.reply({ content: userLang.roll.noDice, ephemeral: true });
			return;
		}
		//get thread starting with "🎲"
		try {
			const rollWithMessage = dice.match(DETECT_DICE_MESSAGE)?.[3];
			if (rollWithMessage) {
				dice = dice.replace(DETECT_DICE_MESSAGE, "$1 /* $3 */");
			}
			const rollDice = roll(dice);
			if (!rollDice) {
				await interaction.reply({ content: userLang.roll.noValidDice, ephemeral: true });
				return;
			}
			const parser = parseResult(rollDice, userLang);
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
		.setDescriptionLocalizations({ "fr": fr.scene.description })
		.setNameLocalizations({ "fr": fr.scene.name })
		.addStringOption(option =>
			option
				.setName(en.scene.option.name)
				.setNameLocalizations({ "fr": fr.scene.option.name })
				.setDescription(en.scene.option.description)
				.setDescriptionLocalizations({ "fr": fr.scene.option.description })
				.setRequired(false)
		)
		.addBooleanOption(option =>
			option
				.setName(en.scene.time.name)
				.setNameLocalizations({ "fr": fr.scene.time.name })
				.setDescription(en.scene.time.description)
				.setDescriptionLocalizations({ "fr": fr.scene.time.description })
				.setRequired(false)
		),
	async execute(interaction: CommandInteraction): Promise<void> {
		if (!interaction.guild) return;
		const allCommands = await interaction.guild.commands.fetch();
		const channel = interaction.channel;
		if (!channel || channel.isDMBased() || !channel.isTextBased()) return;

		const option = interaction.options as CommandInteractionOptionResolver;
		const locales: keyof typeof TRANSLATION = interaction.locale as keyof typeof TRANSLATION;
		const userLang = TRANSLATION[locales] || TRANSLATION.en;
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
		.setNameLocalizations({ "fr": fr.help.name })
		.setDescription(en.help.description)
		.setDescriptionLocalizations({ "fr": fr.help.description }),
	async execute(interaction: CommandInteraction): Promise<void> {
		const commandsID = await interaction.guild?.commands.fetch();
		if (!commandsID) return;
		const rollID = commandsID.findKey(command => command.name === "roll");
		const sceneID = commandsID.findKey(command => command.name === "scene");

		const locales: { [key: string]: string } = {
			"fr" : fr.help.message(rollID || "", sceneID || ""),
			"en" : en.help.message(rollID || "", sceneID || "")
		};
		const userLocale = interaction.locale as LocaleString;
		const message = locales[userLocale] || locales.en;
		const reply = await interaction.reply({ content: dedent(message)});
		deleteAfter(reply, 60000);
		return;
	}

};

export const commandsList = [diceRoll, newScene, help];
