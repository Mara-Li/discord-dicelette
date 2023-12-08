import {
	CommandInteraction,
	CommandInteractionOptionResolver,
	GuildMember,
	SlashCommandBuilder,
	TextChannel,
	userMention
} from "discord.js";
import moment from "moment";
import { parseResult, roll } from "./dice";

export const diceRoll = {
	data: new SlashCommandBuilder()
		.setName("roll")
		.setDescription("Roll a dice")
		.addStringOption(option =>
			option.setName("dice")
				.setDescription("The dice to roll")
				.setRequired(true)
		),
	async execute(interaction: CommandInteraction): Promise<void> {
		if (!interaction.guild) return;
		const channel = interaction.channel;
		if (!channel || !channel.isTextBased()) return;
		const option = interaction.options as CommandInteractionOptionResolver;
		const dice = option.getString("dice");
		if (!dice) {
			await interaction.reply({ content: "No dice provided", ephemeral: true });
			return;
		}
		//get thread starting with "🎲"
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
			console.log(mostRecentThread);
			const thread = mostRecentThread.find(thread => thread.name.startsWith("🎲") && !thread.archived);
			if (thread) {
				const msg = `${userMention(interaction.user.id)} - <t:${moment().unix()}>\n${parser}`;
				const msgToEdit = await thread.send("_ _");
				await msgToEdit.edit(msg);
			} else {
				//create thread
				const date = moment().format("YYYY-MM-DD:HH:mm");
				const newThread = await channel.threads.create({
					name: `🎲 ${date}`,
					reason: "New roll thread",
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
	},
}

export const newScene = {
	data : new SlashCommandBuilder()
		.setName("scene")
		.setDescription("Create a new thread for the dice")
		.addStringOption(option =>
			option.setName("scene")
				.setDescription("The name of the scene")
				.setRequired(true)
		),
	async execute(interaction: CommandInteraction): Promise<void> {
		if (!interaction.guild) return;
		const channel = interaction.channel;
		if (!channel || !channel.isTextBased() || !(channel instanceof TextChannel)) return;
		const option = interaction.options as CommandInteractionOptionResolver;
		const scene = option.getString("scene");
		if (!scene) {
			await interaction.reply({ content: "No scene provided", ephemeral: true });
			return;
		}
		//create thread
		const newThread = await channel.threads.create({
			name: `🎲 ${scene}`,
			reason: "New scene thread",
		});
		await interaction.reply({ content: `New scene thread created: ${newThread.name}`, ephemeral: true });
		const msgToEdit = await newThread.send("_ _");
		const msg = `${userMention(interaction.user.id)} - <t:${moment().unix()}:R>\nScene: ${scene}`;
		await msgToEdit.edit(msg);
		return;
	}
}

export const commandsList = [diceRoll, newScene];