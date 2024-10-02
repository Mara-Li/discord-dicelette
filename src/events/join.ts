import { commandsList } from "@commands";
import { type EClient, logger } from "@main";

export default (client: EClient): void => {
	client.on("guildCreate", async (guild) => {
		try {
			for (const command of commandsList) {
				await guild.commands.create(command.data);
				logger.trace(`Command ${command.data.name} created in ${guild.name}`);
				client.settings.set(guild.id, true, "converted");
			}
		} catch (e) {
			logger.fatal(e);
		}
	});
};
