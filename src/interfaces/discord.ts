import type * as Djs from "discord.js";
import type Enmap from "enmap";
import type { TFunction } from "i18next";
import type { GuildData } from "./database";

export type DiscordChannel =
	| Djs.PrivateThreadChannel
	| Djs.PublicThreadChannel<boolean>
	| Djs.TextChannel
	| Djs.NewsChannel
	| undefined;

export type DiscordTextChannel =
	| Djs.TextChannel
	| Djs.NewsChannel
	| Djs.StageChannel
	| Djs.PrivateThreadChannel
	| Djs.PublicThreadChannel<boolean>
	| Djs.VoiceChannel;

export type Settings = Enmap<string, GuildData, unknown>;
export type Translation = TFunction<"translation", undefined>;
