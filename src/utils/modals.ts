import { ActionRowBuilder, ButtonInteraction, ModalActionRowComponentBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import { StatistiqueTemplate } from "src/interface";

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