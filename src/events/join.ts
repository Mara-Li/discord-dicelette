import { commandsList } from "@commands";
import { error, log } from "@console";

export default (client: EClient): void => {
	client.on("guildCreate", async (guild) => {
		try {
			for (const command of commandsList) {
				await guild.commands.create(command.data);
				log(`Command ${command.data.name} created in ${guild.name}`);
				client.settings.set(guild.id, true, "converted");
			}
		} catch (e) {
			error(e);
		}
	});
};
