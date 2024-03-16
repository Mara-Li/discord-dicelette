// FILEPATH: /c:/Users/simonettili/Documents/Github/discord-dicelette/src/utils/verify_template.test.ts
import { StatisticalTemplate } from "../src/interface";
import { evalCombinaison, generateRandomStat,testCombinaison, testFormula, verifyTemplateValue } from "../src/utils/verify_template";

describe("verify_template", () => {
	describe("evalCombinaison", () => {
		it("should evaluate the combination correctly", () => {
			const combinaison = { stat1: "stat2 + 3" };
			const stats = { stat2: 2 };
			const result = evalCombinaison(combinaison, stats);
			expect(result).toEqual({ stat1: 5 });
		});

		it("should throw an error for invalid formula", () => {
			const combinaison = { stat1: "stat2 + " };
			const stats = { stat2: 2 };
			expect(() => evalCombinaison(combinaison, stats)).toThrow();
		});
	});

	describe("verifyRandomGenerator", () => {
		// Add more tests for different scenarios
		it("should verify the random generator correctly", () => {
			const total = 100;
			const max = 50;
			const min = 10;
			const result = generateRandomStat(total, max, min);
			expect(result).toBeGreaterThanOrEqual(min);
			expect(result).toBeLessThanOrEqual(max);
			expect(result).toBeLessThanOrEqual(total);
		});
		
		it ("should verify with no max", () => {
			const total = 100;
			const min = 1;
			const result = generateRandomStat(total, undefined, min);
			expect(result).toBeGreaterThanOrEqual(min);
			expect(result).toBeLessThanOrEqual(total);
		});

		it ("should verify with no min", () => {
			const total = 100;
			const max = 99;
			const result = generateRandomStat(total, max, undefined);
			expect(result).toBeGreaterThanOrEqual(0);
			expect(result).toBeLessThanOrEqual(max);
		});

		it ("should verify with no min and max", () => {
			const total = 100;
			const result = generateRandomStat(total, undefined, undefined);
			expect(result).toBeGreaterThanOrEqual(0);
			expect(result).toBeLessThanOrEqual(total);
		});

		it ("should verify with no total", () => {
			const max = 99;
			const min = 1;
			const result = generateRandomStat(undefined, max, min);
			expect(result).toBeGreaterThanOrEqual(min);
			expect(result).toBeLessThanOrEqual(max);
		});

		it ("should verify with no total, min and max", () => {
			const result = generateRandomStat(undefined, undefined, undefined);
			expect(result).toBeGreaterThanOrEqual(0);
			expect(result).toBeLessThanOrEqual(100);
		});
	});

	describe("verifyTemplateValue", () => {
		// Add more tests for different scenarios
		it("should verify the template correctly", () => {
			const template = {
				statistics: { stat1: { max: 10, min: 1 } },
				diceType: "d6",
				comparator: { sign: ">", value: 5, formula: "$ * 2" },
				damage: {
					"piercing": "1d6+2",
				}
			};
			const result = verifyTemplateValue(template);
			expect(result).toEqual(template);
		});

		it("testing no statistic, only damage", () => {
			const template = {
				diceType: "d6",
				damage: {
					"piercing": "1d6+2>20",
				}
			};
			const result = verifyTemplateValue(template);
			expect(result).toEqual(template);
		});

		it("should throw an error for invalid dice type", () => {
			const template = {
				statistics: { stat1: { max: 10, min: 1, combinaison: "stat2 + 3" } },
				diceType: "invalid",
				comparator: { sign: ">", value: 5, formula: "stat1 * 2" },
			};
			expect(() => verifyTemplateValue(template)).toThrow();
		});
	});

	describe("testCombinaison", () => {
		// Add more tests for different scenarios
		it("should throw an error because they are no stat2", () => {
			const template: StatisticalTemplate = {
				statistics: { stat1: { max: 10, min: 1, combinaison: "stat2 + 3" } },
				diceType: "d6",
				comparator: { sign: ">", value: 5, formula: "stat1 * 2" },
			};
			expect(() => testCombinaison(template)).toThrow();
		});
	});

	describe("testFormula", () => {
		// Add more tests for different scenarios
		it("should test the formula correctly", () => {
			const template: StatisticalTemplate = {
				statistics: { stat1: { max: 10, min: 1 } },
				diceType: "d6",
				comparator: { sign: ">", value: 5, formula: "$ * 2" },
			};
			expect(() => testFormula(template)).not.toThrow();
		});
	});
});