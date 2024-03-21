import { AutocompleteInteraction, CommandInteraction, CommandInteractionOptionResolver, Locale, SlashCommandBuilder } from "discord.js";

import { ln } from "../localizations";
import { filterChoices, title } from "../utils";
import { getGuildData, getUserData } from "../utils/db";

export const displayUser = {
	data: new SlashCommandBuilder()
		.setName("display")
		.setDescription("Display user's stats")
		.addUserOption(option =>
			option
				.setName("user")
				.setDescription("The user to display")
				.setRequired(false)
		)
		.addStringOption(option =>
			option
				.setName("chara_name")
				.setDescription("The character name to display")
				.setRequired(false)
				.setAutocomplete(true)
		),	
	async autocomplete(interaction: AutocompleteInteraction): Promise<void> {
		const options = interaction.options as CommandInteractionOptionResolver;
		const fixed = options.getFocused(true);
		const guildData = getGuildData(interaction);
		if (!guildData) return;
		let choices: string[] = [];
		if (fixed.name === "chara_name") {
			//get ALL characters from the guild
			const allCharactersFromGuild = Object.values(guildData.user)
				.map((data) => data.map((char) => char.charName ?? ""))
				.flat()
				.filter((data) => data.length > 0);
			choices = allCharactersFromGuild;
		}
		if (choices.length === 0) return;
		const filter = filterChoices(choices, interaction.options.getFocused());
		await interaction.respond(
			filter.map(result => ({ name: title(result) ?? result, value: result}))
		);
	}, 
	async execute(interaction: CommandInteraction) {
		const options = interaction.options as CommandInteractionOptionResolver;
		const guildData = getGuildData(interaction);
		const ul = ln(interaction.locale as Locale);
		if (!guildData) {
			await interaction.reply(ul("error.noTemplate"));
			return;
		}
		const user = options.getUser("user");
		const charName = options.getString("chara_name")?.toLowerCase();
		let charData: { [key: string]: {
			charName?: string;
			messageId: string;
			damageName?: string[];
		} } = {};
		if (!user && charName) {
			//get the character data in the database 
			const allUsersData = guildData.user;
			const allUsers = Object.entries(allUsersData);
			for (const [user, data] of allUsers) {
				const userChar = data.find((char) => char.charName === charName);
				if (userChar) {
					charData = {
						[user as string]: userChar
					};
					break;
				}
			}
		} else {
			const userData = getUserData(guildData, user?.id ?? interaction.user.id);
			const findChara = userData?.find((char) => char.charName === charName);
			if (!findChara) {
				const userName = user?.username ?? interaction.user.username;
				if (charName) userName.concat(` (${charName})`);
				await interaction.reply(ul("error.userNotRegistered", {user: userName}));
				return;
			}
			charData = {
				[(user?.id ?? interaction.user.id)]: findChara
			};
		} 
		await interaction.reply({ content: "Displaying user's stats", ephemeral: true });
		console.log(charData);
	}
};