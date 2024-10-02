import * as Djs from "discord.js";
import { default as i18next } from "i18next";

import { error, log } from "@console";
import {
	DiceTypeError,
	EmptyObjectError,
	FormulaError,
	MaxGreater,
	NoStatisticsError,
	TooManyDice,
	TooManyStats,
} from "@dicelette/core";
import { ALL_TRANSLATION_KEYS } from "@main";
import { InvalidCsvContent, NoChannel, NoEmbed } from "@utils";
import { resources } from "./init";

export function ln(userLang: Djs.Locale) {
	if (userLang === Djs.Locale.EnglishUS || userLang === Djs.Locale.EnglishGB)
		return i18next.getFixedT("en");
	const localeName = Object.entries(Djs.Locale).find(([name, abbr]) => {
		return name === userLang || abbr === userLang;
	});
	return i18next.getFixedT(localeName?.[1] ?? "en");
}

export function lError(
	e: Error,
	interaction?: Djs.BaseInteraction,
	userLang?: Djs.Locale
) {
	const ul = ln(userLang ?? interaction?.locale ?? Djs.Locale.EnglishUS);
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

	if (e instanceof Djs.DiscordAPIError) {
		if (e.method === "DELETE") {
			error("Error while deleting message", e);
			return "";
		}
		if (e.code === 50001) return ul("error.missingPermission");
		return ul("error.discord", { code: e.code, stack: e.stack });
	}
	if (e.message.includes(":warning:")) return ul("error.generic.e", { e });
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
	const localized: Djs.LocalizationMap = {};
	const allValidLocale = Object.entries(Djs.Locale);
	const allTranslatedLanguages = Object.keys(resources).filter(
		(lang) => !lang.includes("en")
	);
	for (const [name, Locale] of allValidLocale) {
		if (allTranslatedLanguages.includes(Locale)) {
			const ul = ln(name as Djs.Locale);
			localized[Locale as Djs.Locale] = ul(key);
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
 * @example : "Nom du personnage" => ""common.charName"
 */
export function findln(translatedText: string) {
	const allLocales = Object.keys(resources);
	for (const locale of allLocales) {
		const ul = ln(locale as Djs.Locale);
		for (const key of ALL_TRANSLATION_KEYS) {
			if (ul(key).toLowerCase() === translatedText.toLowerCase()) {
				log(`Key found: ${key}`);
				return key;
			}
		}
	}
	return translatedText;
}
