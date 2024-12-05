import { ln } from "@dicelette/localization";
import type { Settings } from "@dicelette/types";
import * as Djs from "discord.js";
import { allowEdit } from "utils/check";

/**
 * Interaction to add a new skill dice
 * @param interaction {Djs.ButtonInteraction}
 * @param interactionUser {User}
 * @param db
 */
export async function executeAddDiceButton(
	interaction: Djs.ButtonInteraction,
	interactionUser: Djs.User,
	db: Settings
) {
	const allow = await allowEdit(interaction, db, interactionUser);
	if (allow)
		await showDamageDiceModals(
			interaction,
			interaction.customId.includes("first"),
			db.get(interaction.guild!.id, "lang") ?? interaction.locale
		);
}

/**
 * Modal to add a new skill dice
 * @param interaction {Djs.ButtonInteraction}
 * @param first {boolean}
 * - true: It's the modal when the user is registered
 * - false: It's the modal when the user is already registered and a new dice is added to edit the user
 * @param lang
 */
export async function showDamageDiceModals(
	interaction: Djs.ButtonInteraction,
	first?: boolean,
	lang: Djs.Locale = Djs.Locale.EnglishGB
) {
	const ul = ln(lang);
	const id = first ? "damageDice_first" : "damageDice";
	const modal = new Djs.ModalBuilder()
		.setCustomId(id)
		.setTitle(ul("register.embed.damage"));
	const damageDice =
		new Djs.ActionRowBuilder<Djs.ModalActionRowComponentBuilder>().addComponents(
			new Djs.TextInputBuilder()
				.setCustomId("damageName")
				.setLabel(ul("modals.dice.name"))
				.setPlaceholder(ul("modals.dice.placeholder"))
				.setRequired(true)
				.setValue("")
				.setStyle(Djs.TextInputStyle.Short)
		);
	const diceValue =
		new Djs.ActionRowBuilder<Djs.ModalActionRowComponentBuilder>().addComponents(
			new Djs.TextInputBuilder()
				.setCustomId("damageValue")
				.setLabel(ul("modals.dice.value"))
				.setPlaceholder("1d5")
				.setRequired(true)
				.setValue("")
				.setStyle(Djs.TextInputStyle.Short)
		);
	modal.addComponents(damageDice);
	modal.addComponents(diceValue);
	await interaction.showModal(modal);
}
