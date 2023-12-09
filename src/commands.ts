import {
	CommandInteraction,
	CommandInteractionOptionResolver,
	Locale,
	LocaleString,
	SlashCommandBuilder,
	TextChannel,
	userMention
} from "discord.js";
import moment from "moment";
import { parseResult, roll } from "./dice";
import dedent from "ts-dedent";
import fr from "./locales/fr";
import en from "./locales/en";
import { client } from "./index";

const TRANSLATION = {
	fr,
	en
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
			if (channel instanceof TextChannel) {
				//sort threads by date by most recent
				const mostRecentThread = channel.threads.cache.sort((a, b) => {
					const aDate = a.createdTimestamp;
					const bDate = b.createdTimestamp;
					if (aDate && bDate) {
						return bDate - aDate;
					}
					return 0;
				});
				const thread = mostRecentThread.find(thread => thread.name.startsWith("🎲") && !thread.archived);
				//archive old threads
				if (thread) {
					const threadThatMustBeArchived = mostRecentThread.filter(tr => tr.name.startsWith("🎲") && !tr.archived && tr.id !== thread.id);
					for (const thread of threadThatMustBeArchived) {
						await thread[1].setArchived(true);
					}
					const msg = `${userMention(interaction.user.id)} - <t:${moment().unix()}>\n${parser}`;
					const msgToEdit = await thread.send("_ _");
					await msgToEdit.edit(msg);
				} else {
					//create thread
					const date = moment().format("YYYY-MM-DD:HH:mm");
					const newThread = await channel.threads.create({
						name: `🎲 ${date}`,
						reason: userLang.roll.reason,
					});
					//send a empty message to prevent mention...
					const msgToEdit = await newThread.send("_ _");
					const msg = `${userMention(interaction.user.id)} - <t:${moment().unix()}>\n${parser}`;
					await msgToEdit.edit(msg);
				}
				await interaction.reply({ content: parser, ephemeral: true });
				return;
			}
			//send message
			const msg = `${parser}`;
			await interaction.reply({ content: msg });
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
		const channel = interaction.channel;
		if (!channel || !channel.isTextBased() || !(channel instanceof TextChannel)) return;
		const option = interaction.options as CommandInteractionOptionResolver;
		const locales: keyof typeof TRANSLATION = interaction.locale as keyof typeof TRANSLATION;
		const userLang = TRANSLATION[locales] || TRANSLATION.en;
		const scene = option.getString(userLang.scene.option.name);
		if (!scene) {
			await interaction.reply({ content: userLang.scene.noScene, ephemeral: true });
			return;
		}
		//archive old threads
		const threads = channel.threads.cache.filter(thread => thread.name.startsWith("🎲") && !thread.archived);
		for (const thread of threads) {
			await thread[1].setArchived(true);
		}
		const newThread = await channel.threads.create({
			name: `🎲 ${scene}`,
			reason: userLang.scene.reason,
		});
		await interaction.reply({ content: userLang.scene.interaction(scene), ephemeral: true });
		const allCommands = await client.application?.commands.fetch();
		const rollCommand = allCommands?.findKey(command => command.name === "roll") || "";
		const msgToEdit = await newThread.send("_ _");
		const msg = `${userMention(interaction.user.id)} - <t:${moment().unix()}:R>\n${userLang.scene.underscore} ${scene}\n*roll: </roll:${rollCommand}>*`;
		await msgToEdit.edit(msg);
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
		await interaction.reply({ content: dedent(message), ephemeral: true });

		return;
	}

}

export const commandsList = [diceRoll, newScene, help];
