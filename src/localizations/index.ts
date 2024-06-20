import { type BaseInteraction, Locale, type LocalizationMap } from "discord.js";
import { default as i18next } from "i18next";

import { resources } from "./init";
import { ALL_TRANSLATION_KEYS } from "..";
import {
	DiceTypeError,
	FormulaError,
	MaxGreater,
	EmptyObjectError,
	TooManyDice,
	NoStatisticsError,
	TooManyStats,
} from "@dicelette/core";
import { InvalidCsvContent, NoChannel, NoEmbed } from "../utils";

export function ln(userLang: Locale) {
	const localeName = Object.entries(Locale).find(([name, abbr]) => {
		return name === userLang || abbr === userLang;
	});
	return i18next.getFixedT(localeName?.[1] ?? "en");
}

export function lError(error: Error, interaction?: BaseInteraction, userLang?: Locale) {
	const ul = ln(interaction?.locale ?? userLang ?? Locale.EnglishUS);
	if (error instanceof DiceTypeError) {
		return ul("error.invalidDice.withDice", { dice: error.dice });
	}
	if (error instanceof FormulaError) {
		return ul("error.invalidFormula", { formula: error.formula });
	}
	if (error instanceof MaxGreater) {
		return ul("error.mustBeGreater", { max: error.max, value: error.value });
	}
	if (error instanceof EmptyObjectError) {
		return ul("error.emptyDamage");
	}
	if (error instanceof TooManyDice) {
		return ul("error.tooMuchDice");
	}
	if (error instanceof NoStatisticsError) {
		return ul("error.emptyStats");
	}
	if (error instanceof TooManyStats) {
		return ul("error.tooMuchStats");
	}
	if (error instanceof NoEmbed) {
		return ul("error.noEmbed");
	}
	if (error instanceof InvalidCsvContent) {
		return ul("error.csvContent", { fichier: error.file });
	}
	if (error instanceof NoChannel) {
		return ul("error.channel", { channel: "" });
	}
	return ul("error.generic", { e: error });
}

/**
 * Create an object with all the translations for a specific key
 * @example
 * ```ts
 * cmdLn("hello"):
 * {
 * 	"en": "Hello",
 * 	"fr": "Bonjour"
 * }
 * ```
 * @param key i18n key
 * @returns
 */
export function cmdLn(key: string) {
	const localized: LocalizationMap = {};
	const allValidLocale = Object.entries(Locale);
	const allTranslatedLanguages = Object.keys(resources).filter(
		(lang) => !lang.includes("en")
	);
	for (const [name, locale] of allValidLocale) {
		if (allTranslatedLanguages.includes(locale)) {
			const ul = ln(name as Locale);
			localized[locale as Locale] = ul(key);
		}
	}
	return localized;
}

interface JsonObject {
	//biome-ignore lint/suspicious/noExplicitAny: <explanation>
	[key: string]: any;
}

export function flattenJson(
	obj: JsonObject,
	parentKey = "",
	result: JsonObject = {}
): JsonObject {
	for (const key in obj) {
		// biome-ignore lint/suspicious/noPrototypeBuiltins: <explanation>
		if (obj.hasOwnProperty(key)) {
			const newKey = parentKey ? `${parentKey}.${key}` : key;
			if (typeof obj[key] === "object" && !Array.isArray(obj[key])) {
				flattenJson(obj[key], newKey, result);
			} else {
				result[newKey] = obj[key];
			}
		}
	}
	return result;
}

/**
 * Get the translation key from the translation text
 * @param key {string}
 * @param embed {{[name: string]: string}}
 * @example : "Nom du personnage" => ""common.charName"
 */
export function findln(translatedText: string) {
	const allLocales = Object.keys(resources);
	for (const locale of allLocales) {
		const ul = ln(locale as Locale);
		for (const key of ALL_TRANSLATION_KEYS) {
			if (ul(key).toLowerCase() === translatedText.toLowerCase()) return key;
		}
	}
	return translatedText;
}
