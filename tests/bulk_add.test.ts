import { readFileSync } from "fs";
import { describe, expect,it} from "vitest";

import { parseCSV } from "../src/commands/admin/import";
import { UserData } from "../src/interface";
import { expectedResult, guildTemplate } from "./constant.tests";

describe("parseCSV", () => {
	it("should be valid and equal", async () => {
		const csv = readFileSync("tests/data/should_pass.csv", "utf-8");
		const result = await parseCSV(csv, guildTemplate);
		expect(result).toEqual(expectedResult);
	});
	it("should throw an error", async () => {
		const csv = ""; //empty
		await expect(parseCSV(csv, guildTemplate)).rejects.toThrow();
	});
	it("should remove duplicate keys", async () => {
		const csv = readFileSync("tests/data/duplicate.csv", "utf-8");
		const result = await parseCSV(csv, guildTemplate);
		expect(result).toEqual(expectedResult);
	});
	it("should skip the empty charname", async () => {
		const csv = readFileSync("tests/data/empty_char.csv", "utf-8");
		const result = await parseCSV(csv, guildTemplate);
		const expectedClean = JSON.parse(JSON.stringify(expectedResult)) as {[id: string]: UserData[]};
		expectedClean.truc = [];
		expect(result).toEqual(expectedClean);
	}); 
	it("should skip the empty stats", async () => {
		const csv = readFileSync("tests/data/empty_stats.csv", "utf-8");
		const result = await parseCSV(csv, guildTemplate);
		const expectedClean = JSON.parse(JSON.stringify(expectedResult)) as {[id: string]: UserData[]};
		expectedClean.truc = [];
		expect(result).toEqual(expectedClean);
	});
	it("should ignore the added columns", async () => {
		const csv = readFileSync("tests/data/added_columns.csv", "utf-8");
		const result = await parseCSV(csv, guildTemplate);
		expect(result).toEqual(expectedResult);
	});
	it("should throw an error because of missing header", async () => {
		const csv = readFileSync("tests/data/wrong_header.csv", "utf-8");
		await expect(parseCSV(csv, guildTemplate)).rejects.toThrow("Missing header values");
	});
});