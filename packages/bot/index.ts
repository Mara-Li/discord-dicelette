import { resources } from "@dicelette/localization";
import { logger } from "@dicelette/utils";
import dotenv from "dotenv";
import i18next from "i18next";
import "uniformize";
import process from "node:process";
import { client } from "client";
import {
	onDeleteChannel,
	onDeleteMessage,
	onDeleteThread,
	onKick,
} from "events/on_delete";
import onInteraction from "events/on_interaction";
import onJoin from "events/on_join";
import { onReactionAdd, onReactionRemove } from "events/on_message_reaction";
import onMessageSend from "events/on_message_send";
import ready from "events/ready";

await i18next.init({
	lng: "en",
	fallbackLng: "en",
	returnNull: false,
	resources,
});
dotenv.config({ path: ".env" });
logger.info("Starting bot...");
//@ts-ignore
export const VERSION = process.env.npm_package_version ?? "/";
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

// noinspection JSIgnoredPromiseFromCall
client.login(process.env.DISCORD_TOKEN);
