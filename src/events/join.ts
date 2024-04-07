
import { commandsList } from "@commands";
import { EClient } from "@main";

export default (client: EClient): void => {
	client.on("guildCreate", async (guild) => {
		try {
			for (const command of commandsList) {
				await guild.commands.create(command.data);
				console.log(`Command ${command.data.name} created in ${guild.name}`);
			}
		} catch (error) {
			console.error(error);
		}
	});
};