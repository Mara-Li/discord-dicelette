import { Client, GatewayIntentBits, Partials } from "discord.js";
import dotenv from "dotenv";
import * as process from "process";

import * as pkg from "../package.json";
import interaction from "./events/interaction";
import ready from "./events/ready";
import join from "./events/join";
import message_create from "./events/message_create";
dotenv.config({ path: ".env" });

export const client = new Client({
	intents: [
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMembers,
	],
	partials: [
		Partials.Channel,
		Partials.GuildMember,
		Partials.User
	],
});

export const VERSION = pkg.version ?? "0.0.0";
export const CHANNEL_ID = process.env.CHANNEL_ID ?? "0";
export const prod = process.env.NODE_ENV === "production";

try {
	ready(client);
	interaction(client);
	join(client);
	message_create(client);
}
catch (error) {
	console.error(error);
}


client.login(process.env.DISCORD_TOKEN);