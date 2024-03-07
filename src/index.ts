import { Client, GatewayIntentBits, Partials } from "discord.js";
import dotenv from "dotenv";
import * as process from "process";

import * as pkg from "../package.json";
import onChannelDelete from "./events/channel_delete";
import onMessageDelete from "./events/delete_message";
import interaction from "./events/interaction";
import join from "./events/join";
import message_create from "./events/message_create";
import on_quit from "./events/on_quit";
import ready from "./events/ready";

dotenv.config({ path: ".env" });

export const client = new Client({
	intents: [
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.Guilds,
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
	onMessageDelete(client);
	onChannelDelete(client);
	on_quit(client);
}
catch (error) {
	console.error(error);
}


client.login(process.env.DISCORD_TOKEN);