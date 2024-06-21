import type { StatisticalTemplate } from "@dicelette/core";

import type { UserData } from "../src/interface";

export const guildTemplate: StatisticalTemplate = {
	charName: true,
	statistics: {
		STR: { max: 18, min: 3 },
		DEX: { max: 18, min: 3 },
		CON: { max: 18, min: 3 },
		INT: { max: 18, min: 3 },
		WIS: { max: 18, min: 3 },
		CHA: { max: 18, min: 3 },
	},
	total: 88,
	diceType: "4d6",
	critical: { success: 20, failure: 1 },
	damage: {
		STR: "1d4",
		DEX: "1d4",
		CON: "1d4",
		INT: "1d4",
		WIS: "1d4",
		CHA: "1d4",
	},
};

export const cloneWithoutUserName: StatisticalTemplate = structuredClone(
	structuredClone(guildTemplate)
);
cloneWithoutUserName.charName = false;

const temp = {
	diceType: "4d6",
	critical: { success: 20, failure: 1 },
};

export const expectedResult: { [id: string]: UserData[] } = {
	mara__li: [
		{
			userName: "Blaïka",
			stats: {
				STR: 12,
				DEX: 12,
				CON: 12,
				INT: 12,
				WIS: 12,
				CHA: 12,
			},
			template: temp,
		},
	],
	truc: [
		{
			userName: "machin",
			stats: {
				STR: 11,
				DEX: 10,
				CON: 11,
				INT: 10,
				WIS: 11,
				CHA: 10,
			},
			template: temp,
		},
	],
};

export const clonedExpectedResultWithSkills: { [id: string]: UserData[] } =
	structuredClone(expectedResult);

clonedExpectedResultWithSkills.mara__li[0].damage = {
	athletics: "1d4+STR",
	acrobatics: "1d4+DEX",
};

clonedExpectedResultWithSkills.truc[0].damage = {
	athletics: "1d4+STR",
	acrobatics: "1d4+DEX",
};
