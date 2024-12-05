import * as Djs from "discord.js";
import { describe, expect, it } from "vitest";
import { rollText } from "../src/roll";

describe("roll", () => {
	it("should not throw an error", () => {
		const roll = rollText(
			"1d20",
			{ lang: Djs.Locale.EnglishUS, userId: "userId" },
			undefined,
			"charName",
			undefined,
			false,
			{ guildId: "guildId", channelId: "channelId", messageId: "messageId" },
			"logUrl"
		);
		console.log(roll);
		expect(roll).toBeDefined();
	});
});
