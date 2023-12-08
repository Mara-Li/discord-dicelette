import {
	CommandInteraction,
	CommandInteractionOptionResolver,
	SlashCommandBuilder
} from "discord.js";


export const ping = {
	data: new SlashCommandBuilder()
		.setName("ping")
		.setDescription("Replies with Pong!"),
	async execute(interaction: CommandInteraction): Promise<void> {
		await interaction.reply("Pong!");
	},
}

export const commandsList = [ping];