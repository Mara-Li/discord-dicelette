import * as process from "node:process";
import * as pkg from "../package.json" assert { type: "json" };
import * as Djs from "discord.js";
import dotenv from "dotenv";
import Enmap from "enmap";
import "uniformize";
import { type ILogObj, Logger } from "tslog";

//group type & interface
import type { GuildData } from "@interfaces/database";

//group: Import @events
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
import { onReactionAdd, onReactionRemove } from "@events/MessageReactionAdd";

//group: Localization
import { flattenJson } from "@localization";
import { resources } from "@localization/init";

// Load the environment variables
dotenv.config({ path: ".env" });

const optionLoggers =
	process.env.NODE_ENV === "development"
		? { minLevel: 0 }
		: { minLevel: 4, hideLogPositionForProduction: true };

export const logger: Logger<ILogObj> = new Logger(optionLoggers);
logger.info("Starting bot...");

export class EClient extends Djs.Client {
	// Déclaration d'une propriété settings avec le type Enmap<string, any>
	public settings: Enmap<string, GuildData, unknown>;

	constructor(options: Djs.ClientOptions) {
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
		Djs.GatewayIntentBits.GuildMessages,
		Djs.GatewayIntentBits.MessageContent,
		Djs.GatewayIntentBits.Guilds,
		Djs.GatewayIntentBits.GuildMembers,
		Djs.GatewayIntentBits.GuildMessageReactions,
	],
	partials: [
		Djs.Partials.Channel,
		Djs.Partials.GuildMember,
		Djs.Partials.User,
		Djs.Partials.Reaction,
		Djs.Partials.User,
	],
});

export const VERSION = pkg.version ?? "0.0.0";

try {
	ready(client);
	interaction(client);
	join(client);
	MESSAGE_CREATE(client);
	ON_KICK(client);
	DELETE_MESSAGE(client);
	DELETE_CHANNEL(client);
	DELETE_THREAD(client);
	onReactionAdd(client);
	onReactionRemove(client);
} catch (error) {
	console.error(error);
}

// noinspection JSIgnoredPromiseFromCall
client.login(process.env.DISCORD_TOKEN);
