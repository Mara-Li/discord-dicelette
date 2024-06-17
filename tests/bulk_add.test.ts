import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { parseCSV } from "../src/commands/admin/import";
import type { UserData } from "../src/interface";
import {
	expectedResult,
	expectedResult_WithSkills,
	guildTemplate,
	guildTemplate_noUserName,
} from "./constant.tests";

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
		const expectedClean = JSON.parse(JSON.stringify(expectedResult)) as {
			[id: string]: UserData[];
		};
		expectedClean.truc = [];
		expect(result).toEqual(expectedClean);
	});
	it("should skip the empty stats", async () => {
		const csv = readFileSync("tests/data/empty_stats.csv", "utf-8");
		const result = await parseCSV(csv, guildTemplate);
		const expectedClean = JSON.parse(JSON.stringify(expectedResult)) as {
			[id: string]: UserData[];
		};
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
	it("should pass the quoted as it was a normal value", async () => {
		const csv = readFileSync("tests/data/quoted.csv", "utf-8");
		const result = await parseCSV(csv, guildTemplate);
		const expected = JSON.parse(JSON.stringify(expectedResult)) as {
			[id: string]: UserData[];
		};
		expected["12548784545"] = [
			{
				template: expected.truc[0].template,
				stats: expected.truc[0].stats,
				userName: "helo",
			},
		];
		expect(result).toEqual(expected);
	});
});

describe("parseCSV with no userName", () => {
	it("should pass", async () => {
		const csv = readFileSync("tests/data/should_pass.csv", "utf-8");
		const result = await parseCSV(csv, guildTemplate_noUserName);
		expect(result).toEqual(expectedResult);
	});
	it("should pass even with empty charname", async () => {
		const csv = readFileSync("tests/data/noUserName/should_pass.csv", "utf-8");
		const result = await parseCSV(csv, guildTemplate_noUserName);
		const expected = JSON.parse(JSON.stringify(expectedResult)) as {
			[id: string]: UserData[];
		};
		expected.truc[0].userName = null;
		expect(result).toEqual(expected);
	});
	it("should allow isPrivate", async () => {
		const csv = readFileSync("tests/data/noUserName/private.csv", "utf-8");
		const result = await parseCSV(csv, guildTemplate_noUserName, undefined, true);
		const expected = JSON.parse(JSON.stringify(expectedResult)) as {
			[id: string]: UserData[];
		};
		expected.truc[0].userName = null;
		expected.truc[0].private = undefined;
		expected.mara__li[0].private = true;
		expect(result).toEqual(expected);
	});
});

describe("parseCSV with skills", () => {
	it("should pass", async () => {
		const csv = readFileSync("tests/data/skills/should_pass.csv", "utf-8");
		const result = await parseCSV(csv, guildTemplate);
		expect(result).toEqual(expectedResult_WithSkills);
	});
});
