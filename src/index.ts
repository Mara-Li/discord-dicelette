import { Client, ClientOptions, GatewayIntentBits, Partials } from "discord.js";
import dotenv from "dotenv";
import Enmap from "enmap";
import * as process from "process";

import * as pkg from "../package.json";
import interaction from "./events/interaction";
import join from "./events/join";
import message_create from "./events/message_create";
import { delete_channel,delete_message, delete_thread,on_kick } from "./events/on_delete";
import ready from "./events/ready";
import { GuildData } from "./interface";

dotenv.config({ path: ".env" });

export class EClient extends Client {
	// Déclaration d'une propriété settings avec le type Enmap<string, any>
	public settings: Enmap<string, GuildData>;
  
	constructor(options: ClientOptions) {
		super(options);
  
		// Initialisation de Enmap et attachement au client
		this.settings = new Enmap({ name: "settings",
			fetchAll: false,
			autoFetch: true,
			cloneLevel: "deep" });
	}
}

export const client = new EClient({
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
	on_kick(client);
	delete_message(client);
	delete_channel(client);
	delete_thread(client);
}
catch (error) {
	console.error(error);
}

client.login(process.env.DISCORD_TOKEN);