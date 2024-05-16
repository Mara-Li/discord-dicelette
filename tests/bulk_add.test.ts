import { StatisticalTemplate } from "@dicelette/core";

import { parseCSV } from "../src/commands/admin/bulk_add";

describe("parseCSV", () => {
	it("parses a CSV file", async () => {
		const url = "";
		const guildTemplate: StatisticalTemplate = {
			charName: true,
			statistics: {
				"STR": { max: 18, min: 3 },
				"DEX": { max: 18, min: 3 },
				"CON": { max: 18, min: 3 },
				"INT": { max: 18, min: 3 },
				"WIS": { max: 18, min: 3 },
				"CHA": { max: 18, min: 3 },
			},
			total: 88,
			diceType: "4d6",
			critical: { success: 20, failure: 1 },
			damage: {
				"STR": "1d4",
				"DEX": "1d4",
				"CON": "1d4",
				"INT": "1d4",
				"WIS": "1d4",
				"CHA": "1d4",
			},
		};
		const result = parseCSV(url, guildTemplate);
	});
});