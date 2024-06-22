import {
	type BaseInteraction,
	DiscordAPIError,
	Locale,
	type LocalizationMap,
} from "discord.js";
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
import { error } from "../console";

export function ln(userLang: Locale) {
	const localeName = Object.entries(Locale).find(([name, abbr]) => {
		return name === userLang || abbr === userLang;
	});
	return i18next.getFixedT(localeName?.[1] ?? "en");
}

export function lError(e: Error, interaction?: BaseInteraction, userLang?: Locale) {
	const ul = ln(interaction?.locale ?? userLang ?? Locale.EnglishUS);
	console.error(e);
	if (e instanceof DiceTypeError)
		return ul("error.invalidDice.withDice", { dice: e.dice });

	if (e instanceof FormulaError)
		return ul("error.invalidFormula", { formula: e.formula });

	if (e instanceof MaxGreater)
		return ul("error.mustBeGreater", { max: e.max, value: e.value });

	if (e instanceof EmptyObjectError) return ul("error.emptyDamage");

	if (e instanceof TooManyDice) return ul("error.tooMuchDice");

	if (e instanceof NoStatisticsError) return ul("error.emptyStats");

	if (e instanceof TooManyStats) return ul("error.tooMuchStats");

	if (e instanceof NoEmbed) return ul("error.noEmbed");

	if (e instanceof InvalidCsvContent) return ul("error.csvContent", { fichier: e.file });

	if (e instanceof NoChannel) return ul("error.channel", { channel: "" });

	if (e instanceof DiscordAPIError) {
		if (e.method === "DELETE") {
			error("Error while deleting message", e);
			return "";
		}
		return ul("error.discord", { code: e.code, stack: e.stack });
	}
	if (e.message.includes(":warning:")) {
		return ul("error.generic.e", { e });
	}
	return ul("error.generic.withWarning", { e });
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
