import { logger } from "@dicelette/utils";
import dotenv from "dotenv";
import "uniformize";
import process from "node:process";
import { client } from "client";
import {
	onDeleteChannel,
	onDeleteMessage,
	onDeleteThread,
	onInteraction,
	onJoin,
	onKick,
	onMessageSend,
	onReactionAdd,
	onReactionRemove,
	ready,
} from "event";
import packageJson from "./package.json" assert { type: "json" };
dotenv.config({ path: ".env" });
logger.info("Starting bot...");
logger.trace("Version: " + packageJson.version);
//@ts-ignore
export const VERSION = packageJson.version ?? "/";
try {
	ready(client);
	onInteraction(client);
	onJoin(client);
	onMessageSend(client);
	onKick(client);
	onDeleteMessage(client);
	onDeleteChannel(client);
	onDeleteThread(client);
	onReactionAdd(client);
	onReactionRemove(client);
} catch (error) {
	console.error(error);
}

await client.login(process.env.DISCORD_TOKEN);
