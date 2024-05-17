import { readFileSync } from "fs";

import { parseCSV } from "../src/commands/admin/bulk_add";
import { expectedResult, guildTemplate } from "./constant.tests";

describe("parseCSV", () => {
	it("should be valid and equal", async () => {
		const csv = readFileSync("tests/data/should_pass.csv", "utf-8");
		const result = await parseCSV(csv, guildTemplate);
		expect(result).toEqual(expectedResult);
	});
});