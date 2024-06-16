import { log } from "@console";
import interaction from "@events/interaction";
import join from "@events/join";
import MESSAGE_CREATE from "@events/message_create";
import {
	DELETE_CHANNEL,
	DELETE_MESSAGE,
	DELETE_THREAD,
	ON_KICK,
} from "@events/on_delete";
import ready from "@events/ready";
import type { GuildData } from "@interface";
import { Client, type ClientOptions, GatewayIntentBits, Partials } from "discord.js";
import dotenv from "dotenv";
import Enmap from "enmap";
import * as process from "node:process";

import * as pkg from "../package.json" assert { type: "json" };
import { flattenJson } from "./localizations";
import { resources } from "./localizations/init";

dotenv.config({ path: ".env" });

log("Starting bot...");

export class EClient extends Client {
	// Déclaration d'une propriété settings avec le type Enmap<string, any>
	public settings: Enmap<string, GuildData, unknown>;

	constructor(options: ClientOptions) {
		super(options);

		// Initialisation de Enmap et attachement au client
		this.settings = new Enmap({
			name: "settings",
			fetchAll: false,
			autoFetch: true,
			cloneLevel: "deep",
		});
	}
}

export const ALL_TRANSLATION_KEYS = Object.keys(flattenJson(resources.en.translation));

export const client = new EClient({
	intents: [
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMembers,
	],
	partials: [Partials.Channel, Partials.GuildMember, Partials.User],
});

export const VERSION = pkg.version ?? "0.0.0";
export const CHANNEL_ID = process.env.CHANNEL_ID ?? "0";
export const prod = process.env.NODE_ENV === "production";

try {
	ready(client);
	interaction(client);
	join(client);
	MESSAGE_CREATE(client);
	ON_KICK(client);
	DELETE_MESSAGE(client);
	DELETE_CHANNEL(client);
	DELETE_THREAD(client);
} catch (error) {
	console.error(error);
}

client.login(process.env.DISCORD_TOKEN);
