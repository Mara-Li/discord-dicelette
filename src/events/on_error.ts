import { Client } from "discord.js";

export const botError = (client	: Client): void => {
	client.on("error", (error) => {
		console.error(error);	//prevent the crash of the entire application
	});
};

