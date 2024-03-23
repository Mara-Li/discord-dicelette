import { Client } from "discord.js";
import dotenv from "dotenv";

dotenv.config({ path: ".env" });

export const botError = (client	: Client): void => {
	client.on("error", async (error) => {
		console.error(error);
		if (!process.env.OWNER_ID) return;
		const dm = await client.users.createDM(process.env.OWNER_ID);
		dm.send(`An error has occurred:\n\`\`\`\n${error.message}\n\`\`\``);
	});
};

