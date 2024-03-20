import { ButtonInteraction } from "discord.js";
import { TFunction } from "i18next";

import { getEmbeds } from "./parse";

export function editStats(interaction: ButtonInteraction, ul: TFunction<"translation", undefined>) {
	const statsEmbeds = getEmbeds(ul, interaction.message, "stats");
	if (!statsEmbeds) return;
	
}