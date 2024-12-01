import * as Djs from "discord.js";
import moment from "moment";

//group1: Import
import type { EClient } from "@main";

//group 2: discord.js
import { deleteAfter, reply, setTagsForRoll } from "@utils";
import { rollWithInteraction } from "@utils/roll";

import { cmdLn, ln, t } from "@localization";

export const diceRoll = {
	data: new Djs.SlashCommandBuilder()
		.setName(t("roll.name"))
		.setNameLocalizations(cmdLn("roll.name"))
		.setDescription(t("roll.description"))
		.setDescriptionLocalizations(cmdLn("roll.description"))
		.addStringOption((option) =>
			option
				.setName(t("roll.option.name"))
				.setNameLocalizations(cmdLn("roll.option.name"))
				.setDescription(t("roll.option.description"))
				.setDescriptionLocalizations(cmdLn("roll.option.description"))
				.setRequired(true)
		)
		.addBooleanOption((option) =>
			option
				.setName(t("dbRoll.options.hidden.name"))
				.setNameLocalizations(cmdLn("dbRoll.options.hidden.name"))
				.setDescriptionLocalizations(cmdLn("dbRoll.options.hidden.description"))
				.setDescription(t("dbRoll.options.hidden.description"))
				.setRequired(false)
		),
	async execute(interaction: Djs.CommandInteraction, client: EClient): Promise<void> {
		if (!interaction.guild) return;
		const channel = interaction.channel;
		if (!channel || !channel.isTextBased()) return;
		const option = interaction.options as Djs.CommandInteractionOptionResolver;
		const dice = option.getString(t("roll.option.name"), true);
		const hidden = option.getBoolean(t("dbRoll.options.hidden.name"));
		await rollWithInteraction(
			interaction,
			dice,
			channel,
			client.settings,
			undefined,
			undefined,
			undefined,
			undefined,
			hidden
		);
	},
};

export const newScene = {
	data: new Djs.SlashCommandBuilder()
		.setName(t("scene.name"))
		.setDescription(t("scene.description"))
		.setDescriptionLocalizations(cmdLn("scene.description"))
		.setNameLocalizations(cmdLn("scene.name"))
		.addStringOption((option) =>
			option
				.setName(t("scene.option.name"))
				.setNameLocalizations(cmdLn("scene.option.name"))
				.setDescription(t("scene.option.description"))
				.setDescriptionLocalizations(cmdLn("scene.option.description"))
				.setRequired(false)
		)
		.addBooleanOption((option) =>
			option
				.setName(t("scene.time.name"))
				.setNameLocalizations(cmdLn("scene.time.name"))
				.setDescription(t("scene.time.description"))
				.setDescriptionLocalizations(cmdLn("scene.time.description"))
				.setRequired(false)
		),
	async execute(interaction: Djs.CommandInteraction, client: EClient): Promise<void> {
		if (!interaction.guild) return;
		const allCommands = await interaction.guild.commands.fetch();
		const channel = interaction.channel;
		if (!channel || channel.isDMBased() || !channel.isTextBased()) return;

		const option = interaction.options as Djs.CommandInteractionOptionResolver;
		const scene = option.getString(t("scene.option.name"));
		const bubble = option.getBoolean(t("scene.time.name"));
		const lang = client.settings.get(interaction.guild.id, "lang") ?? interaction.locale;
		const ul = ln(lang);
		if (!scene && !bubble) {
			await reply(interaction, { content: ul("scene.noScene"), ephemeral: true });
			return;
		}
		//archive old threads
		if (
			channel instanceof Djs.TextChannel ||
			channel.parent instanceof Djs.ForumChannel ||
			!channel.name.startsWith("🎲")
		) {
			const threads =
				channel instanceof Djs.TextChannel
					? channel.threads.cache.filter(
							(thread) => thread.name.startsWith("🎲") && !thread.archived
						)
					: (channel.parent as Djs.ForumChannel).threads.cache.filter(
							(thread) => thread.name === `🎲 ${scene}` && !thread.archived
						);
			for (const thread of threads) {
				await thread[1].setArchived(true);
			}
			let threadName = "";
			if (bubble) {
				threadName = scene ? ` ⏲ ${scene}` : ` ⏲ ${moment().format("DD-MM-YYYY")}`;
			} else threadName = `🎲 ${scene}`;

			if (threadName.includes("{{date}}"))
				threadName = threadName.replace("{{date}}", moment().format("DD-MM-YYYY"));
			const newThread =
				channel instanceof Djs.TextChannel
					? await channel.threads.create({
							name: threadName,
							reason: ul("scene.reason"),
						})
					: await (channel.parent as Djs.ForumChannel).threads.create({
							name: threadName,
							message: { content: ul("scene.reason") },
							appliedTags: [
								(await setTagsForRoll(channel.parent as Djs.ForumChannel)).id as string,
							],
						});

			const threadMention = Djs.channelMention(newThread.id);
			const msgReply = await reply(interaction, {
				content: ul("scene.interaction", { scene: threadMention }),
			});
			const time = client.settings.get(interaction.guild.id, "deleteAfter") ?? 180000;
			await deleteAfter(msgReply, time);
			const rollID = allCommands.findKey((command) => command.name === "roll");
			const msgToEdit = await newThread.send("_ _");
			const msg = `${Djs.userMention(interaction.user.id)} - <t:${moment().unix()}:R>\n${ul("scene.underscore")} ${scene}\n*roll: </roll:${rollID}>*`;
			await msgToEdit.edit(msg);
		}
		return;
	},
};
