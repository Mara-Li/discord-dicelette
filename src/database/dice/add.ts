import { ActionRowBuilder, ButtonInteraction, EmbedBuilder, Locale, ModalActionRowComponentBuilder,ModalBuilder, ModalSubmitInteraction, PermissionsBitField,TextInputBuilder,TextInputStyle,User } from "discord.js";
import { TFunction } from "i18next";
import removeAccents from "remove-accents";

import { lError, ln } from "../../localizations";
import { removeEmojiAccents, title } from "../../utils";
import { editUserButtons, registerDmgButton, validateCancelButton } from "../../utils/buttons";
import { getTemplateWithDB, getUserByEmbed, registerUser } from "../../utils/db";
import { getEmbeds } from "../../utils/parse";
import { ensureEmbed, evalStatsDice } from "../../utils/verify_template";
import { createDiceEmbed, getUserNameAndChar } from "..";

/**
 * Interaction to add a new skill dice
 * @param interaction {ButtonInteraction}
 * @param ul {TFunction<"translation", undefined>}
 * @param interactionUser {User}
 */
export async function button_add_dice(interaction: ButtonInteraction, ul: TFunction<"translation", undefined>, interactionUser: User
) {
	const embed = ensureEmbed(interaction.message);
	const user = embed.fields.find(field => field.name === ul("common.user"))?.value.replace("<@", "").replace(">", "") === interactionUser.id;
	const isModerator = interaction.guild?.members.cache.get(interactionUser.id)?.permissions.has(PermissionsBitField.Flags.ManageRoles);
	if (user || isModerator)
		showDamageDiceModals(interaction, interaction.customId.includes("first"));
	else
		await interaction.reply({ content: ul("modals.noPermission"), ephemeral: true });
}

/**
 * Modal to add a new skill dice
 * @param interaction {ButtonInteraction}
 * @param first {boolean} 
 * - true: It's the modal when the user is registered
 * - false: It's the modal when the user is already registered and a new dice is added to edit the user
 */
export async function showDamageDiceModals(interaction: ButtonInteraction, first?: boolean) {
	const ul = ln(interaction.locale as Locale);
	const id = first ? "damageDice_first" : "damageDice";
	const modal = new ModalBuilder()
		.setCustomId(id)
		.setTitle(ul("register.embed.damage"));
	const damageDice = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
		new TextInputBuilder()
			.setCustomId("damageName")
			.setLabel("Name")
			.setPlaceholder(ul("modals.dice"))
			.setRequired(true)
			.setValue("")
			.setStyle(TextInputStyle.Short)
	);
	const diceValue = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
		new TextInputBuilder()
			.setCustomId("damageValue")
			.setLabel("Value")
			.setPlaceholder("1d5")
			.setRequired(true)
			.setValue("")
			.setStyle(TextInputStyle.Short)
	);
	modal.addComponents(damageDice);
	modal.addComponents(diceValue);
	await interaction.showModal(modal);
}

/**
 * Interaction to submit the new skill dice
 * Only works if the user is the owner of the user registered in the embed or if the user is a moderator
 * @param interaction {ModalSubmitInteraction}
 * @param ul {TFunction<"translation", undefined>}
 * @param interactionUser {User}
 */
export async function submit_damageDice(interaction: ModalSubmitInteraction, ul: TFunction<"translation", undefined>, interactionUser: User) {
	const template = await getTemplateWithDB(interaction);
	if (!template) {
		await interaction.reply({ content: ul("error.noTemplate") });
		return;
	}
	const embed = ensureEmbed(interaction.message ?? undefined);
	const user = embed.fields.find(field => field.name === ul("common.user"))?.value.replace("<@", "").replace(">", "") === interactionUser.id;
	const isModerator = interaction.guild?.members.cache.get(interactionUser.id)?.permissions.has(PermissionsBitField.Flags.ManageRoles);
	if (user || isModerator)
		await registerDamageDice(interaction, interaction.customId.includes("first"));
	else
		await interaction.reply({ content: ul("modals.noPermission"), ephemeral: true });

}
/**
 * Register the new skill dice in the embed and database
 * @param interaction {ModalSubmitInteraction}
 * @param first {boolean}
 * - true: It's the modal when the user is registered
 * - false: It's the modal when the user is already registered and a new dice is added to edit the user
 */
export async function registerDamageDice(interaction: ModalSubmitInteraction, first?: boolean) {
	const ul = ln(interaction.locale as Locale);
	const name = interaction.fields.getTextInputValue("damageName");
	let value = interaction.fields.getTextInputValue("damageValue");
	if (!interaction.message) throw new Error(ul("error.noMessage"));
	const oldDiceEmbeds = first ? ensureEmbed(interaction.message).toJSON() : getEmbeds(ul, interaction.message ?? undefined, "damage")?.toJSON();
	const diceEmbed = oldDiceEmbeds ? new EmbedBuilder(oldDiceEmbeds) : createDiceEmbed(ul);
	if (oldDiceEmbeds?.fields)
		for (const field of oldDiceEmbeds.fields) {
			//add fields only if not already in the diceEmbed
			if (diceEmbed.toJSON().fields?.findIndex(f => removeEmojiAccents(f.name) === removeEmojiAccents(field.name)) === -1){
				diceEmbed.addFields(field);
			}
		}
	const user = getUserByEmbed(interaction.message, ul, first);
	if (!user) throw new Error(ul("error.user")); //mean that there is no embed
	try {
		value = evalStatsDice(value, user.stats);
	}
	catch (error) {
		const errorMsg = lError(error as Error, interaction);
		await interaction.reply({ content: errorMsg, ephemeral: true });
		return;
	}
	if (diceEmbed.toJSON().fields?.findIndex(f => removeEmojiAccents(f.name) === removeEmojiAccents(name)) === -1 || !diceEmbed.toJSON().fields){
		diceEmbed.addFields({
			name: first ? `🔪${title(removeAccents(name))}` : title(removeAccents(name)),
			value,
			inline: true,
		});}
	const damageName = diceEmbed.toJSON().fields?.reduce((acc, field) => {
		acc[removeEmojiAccents(field.name)] = field.value;
		return acc;
	}, {} as {[name: string]: string});
	if (!first) {
		const userEmbed = getEmbeds(ul, interaction.message ?? undefined, "user");
		if (!userEmbed) throw new Error("[error.noUser]"); //mean that there is no embed
		const statsEmbed = getEmbeds(ul, interaction.message ?? undefined, "stats");
		const templateEmbed = getEmbeds(ul, interaction.message ?? undefined, "template");
		const allEmbeds = [userEmbed];
		if (statsEmbed) allEmbeds.push(statsEmbed);
		allEmbeds.push(diceEmbed);
		if (templateEmbed) allEmbeds.push(templateEmbed);
		const components = editUserButtons(ul, statsEmbed ? true: false, true);
		const { userID, userName, thread } = await getUserNameAndChar(interaction, ul);

		if (damageName && Object.keys(damageName).length > 25) {
			await interaction.reply({ content: ul("error.tooMuchDice"), ephemeral: true });
			const components = editUserButtons(ul, statsEmbed ? true: false, false);
			await interaction?.message?.edit({ embeds: allEmbeds, components: [components] });
			return;
		}
		registerUser(userID, interaction, interaction.message.id, thread, userName, damageName ? Object.keys(damageName) : undefined, false);
		await interaction?.message?.edit({ embeds: allEmbeds, components: [components] });
		await interaction.reply({ content: ul("modals.added.dice"), ephemeral: true });
		return;
	}
	if (damageName && Object.keys(damageName).length > 25) {
		await interaction.reply({ content: ul("error.tooMuchDice"), ephemeral: true });
		const components = validateCancelButton(ul);
		await interaction?.message?.edit({ embeds: [diceEmbed], components: [components] });
		return;
	}
	const components = registerDmgButton(ul);
	await interaction?.message?.edit({ embeds: [diceEmbed], components: [components] });
	await interaction.reply({ content: ul("modals.added.dice"), ephemeral: true });
	return;
}