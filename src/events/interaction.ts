import { BaseInteraction, Client, TextChannel, userMention } from "discord.js";
import fs from "fs";
import {evaluate} from "mathjs";
import removeAccents from "remove-accents";
import { GuildData, User } from "src/interface";

import { commandsList } from "../commands";
import { discordModalsTemplate, verifyTemplateValue } from "../Statistiques/utils";

export default (client: Client): void => {
	client.on("interactionCreate", async (interaction: BaseInteraction) => {
		if (interaction.isCommand()) {
			const command = commandsList.find(
				(cmd) => cmd.data.name === interaction.commandName
			);
			if (!command) return;
			try {
				await command.execute(interaction);
			} catch (error) {
				console.log(error);
			}
		}
		// else if (interaction.isButton() && interaction.customId === "register") {
		// 	const template = interaction.message.attachments.first();
		// 	if (!template || !interaction.guild) return;
		// 	const res = await fetch(template.url).then(res => res.json());
		// 	const templateData = verifyTemplateValue(res);
		// 	const guildData = interaction.guild.id;
		// 	const database = fs.readFileSync("database.json", "utf-8");
		// 	const json = JSON.parse(database);
		// 	if (!json[guildData]) {
		// 		await interaction.reply({ content: "No template"});
		// 		return;
		// 	}
		// 	await discordModalsTemplate(interaction, templateData);
		// } else if (interaction.isModalSubmit()) {
		// 	if (!interaction.guild || !interaction.channel || interaction.channel.isDMBased()) return;
		// 	//recreate the template
		// 	const charName = interaction.fields.getTextInputValue("charName");
		// 	const template = interaction.message?.attachments.first();
		// 	if (!template) return;
		// 	const res = await fetch(template.url).then(res => res.json());
		// 	const combinaisonFields: {[name: string]: string}[] = [];
		// 	const templateData = verifyTemplateValue(res);
		// 	const stats: { [name: string]: number }[] = [];
		// 	let total = templateData.total;
		// 	for (const stat of templateData.statistiques) {
		// 		const key = Object.keys(stat)[0];
		// 		const value = Object.values(stat)[0] as { max?: number, min?: number, combinaison?: string };
		// 		const name = removeAccents(key).toLowerCase();
		// 		const statValue = interaction.fields.getTextInputValue(name);
		// 		if (value.combinaison) {
		// 			combinaisonFields.push({ [name]: value.combinaison });
		// 			continue;
		// 		}
		// 		if (!statValue) continue;
		// 		const num = parseInt(statValue);
		// 		if (value.min && num < value.min || value.max && num > value.max || isNaN(num)) {
		// 			await interaction.reply({ content: `Invalid value for ${name}` });
		// 			return;
		// 		}
		// 		if (total) {
		// 			total -= num;
		// 			if (total < 0) {
		// 				const exceeded = total * -1;
		// 				await interaction.reply({ content: `Total exceeded by ${exceeded}` });
		// 				return;
		// 			} else stats.push({ [name]: num });
		// 		} else stats.push({ [name]: num });
		// 	}
		// 	for (const combinaison of combinaisonFields) {
		// 		const formula = Object.values(combinaison)[0];
		// 		const name = Object.keys(combinaison)[0];
		// 		//search "name" in the formula and replace it by the value
		// 		const regex = new RegExp(name, "g");
		// 		const value = stats.find(stat => Object.keys(stat)[0] === name);
		// 		if (!value) continue;
		// 		const num = Object.values(value)[0];
		// 		const newFormula = formula.replace(regex, num.toString());
		// 		const result = evaluate(newFormula);
		// 		stats.push({ [name]: result });
		// 	}
		// 	const user: User = {
		// 		userName: charName.length > 0 ? charName : undefined,
		// 		stats,
		// 		template: {
		// 			diceType: templateData.diceType,
		// 			comparator: templateData.comparator,
		// 		},
		// 	};
		// 	const guildData = interaction.guild.id;
		// 	const database = fs.readFileSync("database.json", "utf-8");
		// 	const json = JSON.parse(database);
		// 	if (!json[guildData]) {
		// 		await interaction.reply({ content: "No template or configured channel"});
		// 	}
		// 	const serverData = json[guildData] as GuildData;
		// 	const channel = interaction.guild.channels.cache.get(serverData.templateID.channelId);
		// 	if (!channel || !interaction.guild || !channel.isTextBased() || !(channel instanceof TextChannel)) return;
		// 	//search thread named `📝 Users template`
		// 	let thread = channel.threads.cache.find(thread => thread.name === "📝 Users template");
		// 	const userRattached = interaction.fields.getTextInputValue("user");
		// 	const searchUser = interaction.guild.members.cache.get(userRattached) || interaction.guild.members.cache.find(member => member.user.username === userRattached);
		// 	if (!searchUser) {
		// 		await interaction.reply({ content: "Invalid user"});
		// 		return;
		// 	}
		// 	if (!thread)
		// 		thread = await channel.threads.create({ name: "📝 Users template", autoArchiveDuration: 60 });
		// 	const message = await thread.send({ content: `${userMention(searchUser.id)} data`, files: [{ attachment: Buffer.from(JSON.stringify(user, null, 2), "utf-8"), name: "user.json" }] });
		// 	//like userDB[searchUser.id]
		// 	const userDB = serverData.user;
		// 	const player = userDB.find((userArray) => {
		// 		return Object.prototype.hasOwnProperty.call(userArray, searchUser.id);
		// 	});
		// 	if (player) {
		// 		//prevent duplicate on charName
		// 		const index = player[searchUser.id].findIndex((dbUser) => dbUser.charName === user.userName);
		// 		if (index > -1) {
		// 			player[searchUser.id][index].messageId = message.id;
		// 		} else {
		// 			player[searchUser.id].push({
		// 				messageId: message.id,
		// 				charName: user.userName,
		// 			});
		// 		}
		// 	}
		// 	else {
		// 		userDB.push({
		// 			[searchUser.id]: [{
		// 				messageId: message.id,
		// 				charName: user.userName,
		// 			}],
		// 		});
		// 	}
		// 	fs.writeFileSync("database.json", JSON.stringify(json, null, 2), "utf-8");
		// 	await interaction.reply({ content: "User registered", ephemeral: true });
		// }
	}
	);
};