import {
	CommandInteraction,
	CommandInteractionOptionResolver,
	InteractionResponse,
	Message,
	LocaleString,
	SlashCommandBuilder,
	TextChannel,
	channelMention,
	userMention,
	ForumChannel
} from "discord.js";
import moment from "moment";
import { parseResult, roll } from "./dice";
import dedent from "ts-dedent";
import fr from "./locales/fr";
import en from "./locales/en";
import { findForumChannel, findThread } from "./utils";
const TRANSLATION = {
	fr,
	en
}

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
		const dice = option.getString(en.roll.option.name);
		if (!dice) {
			await interaction.reply({ content: userLang.roll.noDice, ephemeral: true });
			return;
		}
		//get thread starting with "🎲"
		try {
			const rollDice = roll(dice)
			const parser = parseResult(rollDice)
			if (channel instanceof TextChannel || channel.parent instanceof ForumChannel) {
				//sort threads by date by most recent
				const thread = channel instanceof TextChannel ? await findThread(channel, userLang.roll.reason) : await findForumChannel(channel.parent as ForumChannel, userLang.roll.reason);
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
}

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
				.setRequired(true)
		),
	async execute(interaction: CommandInteraction): Promise<void> {
		if (!interaction.guild) return;
		const allCommands = await interaction.guild.commands.fetch();
		const channel = interaction.channel;
		if (!channel || channel.isDMBased() || !channel.isTextBased()) return;

		const option = interaction.options as CommandInteractionOptionResolver;
		const locales: keyof typeof TRANSLATION = interaction.locale as keyof typeof TRANSLATION;
		const userLang = TRANSLATION[locales] || TRANSLATION.en;
		const scene = option.getString(userLang.scene.option.name);
		if (!scene) {
			await interaction.reply({ content: userLang.scene.noScene, ephemeral: true });
			return;
		}
		//archive old threads
		if (channel instanceof TextChannel || channel.parent instanceof ForumChannel) {
			const threads = channel instanceof TextChannel ? channel.threads.cache.filter(thread => thread.name.startsWith("🎲") && !thread.archived) : (channel.parent as ForumChannel).threads.cache.filter(thread => thread.name.startsWith("🎲") && !thread.archived);
			for (const thread of threads) {
				await thread[1].setArchived(true);
			}
			const newThread = channel instanceof TextChannel ? await channel.threads.create({
				name: `🎲 ${scene}`,
				reason: userLang.scene.reason,
			}) : await (channel.parent as ForumChannel).threads.create({
				name: `🎲 ${scene}`,
				message: {content: userLang.scene.reason}
			})

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
}

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
		}
		const userLocale = interaction.locale as LocaleString;
		const message = locales[userLocale] || locales.en;
		const reply = await interaction.reply({ content: dedent(message)});
		deleteAfter(reply, 60000);
		return;
	}

}

export const commandsList = [diceRoll, newScene, help];
