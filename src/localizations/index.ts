import { type BaseInteraction, Locale, type LocalizationMap } from "discord.js";
import { default as i18next } from "i18next";

import { resources } from "./init";
import { ALL_TRANSLATION_KEYS } from "..";

export function ln(userLang: Locale) {
	const localeName = Object.entries(Locale).find(([name, abbr]) => {
		return name === userLang || abbr === userLang;
	});
	return i18next.getFixedT(localeName?.[1] ?? "en");
}

export function lError(error: Error, interaction?: BaseInteraction, userLang?: Locale) {
	let errorMessage = error.message;
	let errors: string[] = [];
	//check if errorMessage is a list
	const errorList = /\[(.*)\]/gi.exec(errorMessage);
	if (errorList) {
		errors = errorList?.[1].split(",");
		errorMessage = errorMessage.replace(/\[(.*)\]/, "");
	}
	//get key from translation
	const ul = ln(interaction?.locale ?? userLang ?? Locale.EnglishUS);
	let msgError = "";
	for (const error of errors) {
		msgError += ul(error.trim());
	}
	errorMessage = errorMessage.trim().length > 0 ? `\`\`\`\n${errorMessage}\n\`\`\`` : "";
	return `${msgError}\n${errorMessage}`;
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
export function findKeyFromTranslation(translatedText: string) {
	const allLocales = Object.keys(resources);
	for (const locale of allLocales) {
		const ul = ln(locale as Locale);
		for (const key of ALL_TRANSLATION_KEYS) {
			if (ul(key).toLowerCase() === translatedText.toLowerCase()) return key;
		}
	}
	return translatedText;
}
