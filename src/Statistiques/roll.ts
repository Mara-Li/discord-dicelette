import { AutocompleteInteraction, CommandInteraction, CommandInteractionOptionResolver, SlashCommandBuilder } from "discord.js";
import { evaluate } from "mathjs";

import { getGuildData, getUserData, getUserFromMessage, rollWithInteraction } from "./utils";

export const rollForUser = {
	data: new SlashCommandBuilder()
		.setName("dice")
		.setDescription("Roll a dice using your registered statistiques")
		.addStringOption(option =>
			option
				.setName("statistique")
				.setDescription("The name of the statistique to roll")
				.setRequired(true)
				.setAutocomplete(true)				
		)
		.addStringOption(option =>
			option
				.setName("character")
				.setDescription("If you use a character statistique")
				.setRequired(false)
				.setAutocomplete(true)
		)
		.addStringOption(option =>
			option
				.setName("comments")
				.setDescription("action description")
				.setRequired(false)
		)
		.addStringOption(option =>
			option
				.setName("override")
				.setDescription("Override success threshold")
				.setRequired(false)
		)
		.addNumberOption(option =>
			option
				.setName("modificator")
				.setDescription("bonus/malus to the roll")
				.setRequired(false)
		),
	async autocomplete(interaction: AutocompleteInteraction) {
		const options = interaction.options as CommandInteractionOptionResolver;
		const focused = options.getFocused(true);
		const guildData = getGuildData(interaction);
		if (!guildData) return;
		let choices: string[] = [];
		if (focused.name === "statistique") {
			choices = guildData.templateID.statsName;
		} else if (focused.name === "character") {
			//get user characters 
			const userData = getUserData(guildData, interaction.user.id);
			if (!userData) return;
			const allCharactersFromUser = userData[interaction.user.id]
				.map((data) => data.charName ?? "")
				.filter((data) => data.length > 0);
			choices = allCharactersFromUser;
		}
		await interaction.respond(
			choices.map(result => ({ name: result, value: result}))
		);
	},
	async execute(interaction: CommandInteraction) {
		if (!interaction.guild || !interaction.channel) return;
		const options = interaction.options as CommandInteractionOptionResolver;
		const guildData = getGuildData(interaction);
		if (!guildData) return;
		const charName = options.getString("character") ?? undefined;
		const userStatistique = await getUserFromMessage(guildData, interaction.user.id,  interaction.guild, charName);
		if (!userStatistique) {
			await interaction.reply({ content: "You are not registered", ephemeral: true });
			return;
		}
		//create the string for roll
		const statistique = options.getString("statistique", true);
		//model : {dice}{stats only if not comparator formula}{bonus/malus}{formula}{override/comparator}{comments}
		let comments = options.getString("comments") ?? "";
		const override = options.getString("override");
		const modificator = options.getNumber("modificator") ?? 0;
		const userStat = userStatistique.stats[statistique];
		const template = userStatistique.template;
		let formula = template.comparator.formula;
		const dice = template.diceType;
		let comparator: string = "";
		if (!override) {
			comparator += template.comparator.sign;
			comparator += template.comparator.value ? template.comparator.value.toString() : userStat.toString();
		} else comparator = override;
		const critical: {failure?: number, success?: number} = {
			failure: template.comparator.criticalFailure,
			success: template.comparator.criticalSuccess
		};
		if (formula) {
			formula = evaluate(`${formula.replace("$", userStat.toString())}+ ${modificator}`).toString();
			formula = formula?.startsWith("-") ? formula : `+${formula}`;
		} else formula = modificator ? modificator > 0 ? `+${modificator}` : modificator.toString() : "";
		console.log(formula);
		comments += ` *(${statistique})* - @${charName ? charName : interaction.user.displayName}`;
		const roll = `${dice}${formula}${comparator}${comments ? ` ${comments}` : ""}`;
		try {
			await rollWithInteraction(interaction, roll, interaction.channel, critical);
		} catch (error) {
			await interaction.reply({ content: "No valid dice", ephemeral: true });
		}
	}
};

export const autCompleteCmd = [rollForUser];