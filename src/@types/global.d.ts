import * as Discord from "discord.js";
import { SlashCommandBuilder as _SlashCommandBuilder } from "discord.js";
import type { EClient as Eclient } from "..";
declare global {
	const Client = Discord.Client;
	const ActionRowBuilder = Discord.ActionRowBuilder;
	const ButtonBuilder = Discord.ButtonBuilder;
	type ButtonBuilder = Discord.ButtonBuilder;
	type EClient = Eclient;
	const ButtonStyle = Discord.ButtonStyle;

	const ChannelType = Discord.ChannelType;

	type CommandInteraction = Discord.CommandInteraction;
	const CommandInteraction = Discord.CommandInteraction;

	type CommandInteractionOptionResolver = Discord.CommandInteractionOptionResolver;

	const EmbedBuilder = Discord.EmbedBuilder;
	type EmbedBuilder = Discord.EmbedBuilder;
	type Locale = Discord.Locale;

	const PermissionFlagsBits = Discord.PermissionFlagsBits;

	const SlashCommandBuilder = _SlashCommandBuilder;

	const TextChannel = Discord.TextChannel;
	type TextChannel = Discord.TextChannel;

	const ThreadChannel = Discord.ThreadChannel;
	type ThreadChannel = Discord.ThreadChannel;
	type NonThreadGuildBasedChannel = Discord.NonThreadGuildBasedChannel;
	const channelMention = Discord.channelMention;
	const roleMention = Discord.roleMention;
	type AutocompleteInteraction = Discord.AutocompleteInteraction;
	const userMention = Discord.userMention;
	type GuildMember = Discord.GuildMember;
	type User = Discord.User;
	type APIEmbedField = Discord.APIEmbedField;
	const PermissionsBitField = Discord.PermissionsBitField;
	type Message = Discord.Message;
	const Message = Discord.Message;
	type ModalSubmitInteraction = Discord.ModalSubmitInteraction;
	const ModalSubmitInteraction = Discord.ModalSubmitInteraction;
	const AttachmentBuilder = Discord.AttachmentBuilder;
	type AttachmentBuilder = Discord.AttachmentBuilder;
	type InteractionReplyOptions = Discord.InteractionReplyOptions;
	type MessagePayload = Discord.MessagePayload;
	type GuildChannelResolvable = Discord.GuildChannelResolvable;
	type InteractionResponse = Discord.InteractionResponse;
	type ForumChannel = Discord.ForumChannel;
	const ForumChannel = Discord.ForumChannel;

	type Snowflake = Discord.Snowflake;
	type BaseInteraction = Discord.BaseInteraction;
	type ButtonInteraction = Discord.ButtonInteraction;
	const ButtonInteraction = Discord.ButtonInteraction;
	type StringSelectMenuInteraction = Discord.StringSelectMenuInteraction;
	const Locale = Discord.Locale;
	type GuildTextBasedChannel = Discord.GuildTextBasedChannel;
	const ModalBuilder = Discord.ModalBuilder;
	const ModalActionRowComponentBuilder = Discord.ModalActionRowComponentBuilder;
	type ModalActionRowComponentBuilder = Discord.ModalActionRowComponentBuilder;
	const TextInputBuilder = Discord.TextInputBuilder;
	const TextInputStyle = Discord.TextInputStyle;
	type Guild = Discord.Guild;
	type Embed = Discord.Embed;
	const StringSelectMenuBuilder = Discord.StringSelectMenuBuilder;
	const StringSelectMenuOptionBuilder = Discord.StringSelectMenuOptionBuilder;
	type StringSelectMenuBuilder = Discord.StringSelectMenuBuilder;
	const CategoryChannel = Discord.CategoryChannel;
	type CategoryChannel = Discord.CategoryChannel;
	type Client = Client;
	type GuildForumTagData = Discord.GuildForumTagData;
	const ThreadAutoArchiveDuration = Discord.ThreadAutoArchiveDuration;
	type GuildBasedChannel = Discord.GuildBasedChannel;
	const MediaChannel = Discord.MediaChannel;
	const StageChannel = Discord.StageChannel;
	const VoiceChannel = Discord.VoiceChannel;
	type NewsChannel = Discord.NewsChannel;
	type PrivateThreadChannel = Discord.PrivateThreadChannel;
	const PublicThreadChannel = Discord.PublicThreadChannel;
	type TextBasedChannel = Discord.TextBasedChannel;
	type ClientOptions = Discord.ClientOptions;
	const GatewayIntentBits = Discord.GatewayIntentBits;
	const Partials = Discord.Partials;
	type DiscordTextChannel =
		| Discord.TextChannel
		| Discord.NewsChannel
		| Discord.StageChannel
		| Discord.PrivateThreadChannel
		| Discord.PublicThreadChannel<boolean>
		| Discord.VoiceChannel;
	type DiscordChannel =
		| Discord.PrivateThreadChannel
		| typeof Discord.PublicThreadChannel<boolean>
		| Discord.TextChannel
		| Discord.NewsChannel
		| undefined;
}

// biome-ignore lint/style/useExportType: <explanation>
// biome-ignore lint/complexity/noUselessEmptyExport: <explanation>
export {};
