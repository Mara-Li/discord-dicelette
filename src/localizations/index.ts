import { BaseInteraction, Locale, LocalizationMap } from "discord.js";

import EnglishUS from "./locales/en";
import French from "./locales/fr";

export const TRANSLATIONS = {
	French,
	EnglishUS,
};

export function ln(userLang: Locale) {
	const localeName = Object.entries(Locale).find(([, locale],) => {
		return locale === userLang as Locale;
	});
	return TRANSLATIONS[localeName?.[0] as keyof typeof TRANSLATIONS] ?? TRANSLATIONS.EnglishUS;
}

function getTranslation(key: string, ul: Record<string, unknown>) {
	const keys = key.split(".");
	//keys is now ["help", "description"]
	//get the translation.help.description
	let translationString: string | Record<string, unknown> = ul;
	for (const k of keys) {
		// @ts-ignore
		translationString = translationString[k];
	}
	return translationString as string;
}

export function lError(error: Error, interaction: BaseInteraction) {
	let errorMessage = error.message;
	let errors: string[] = [];
	//check if errorMessage is a list
	const errorList = errorMessage.match(/\[(.*)\]/gi);
	if (errorList && errorList.groups?.[1]) {
		errors = errorList.groups?.[1].split(",");
		errorMessage = errorMessage.replace(/\[(.*)\]/, "");
	}
	//get key from translation
	const ul = ln(interaction.locale);
	let msgError = "";
	
	for (const error of errors) {
		msgError += getTranslation(error, ul);
	}
	return `${msgError}${ul.common.space}:\n\`\`\`\n${errorMessage}\n\`\`\``;

}

export function cmdLn(key: string) {
	const localized: LocalizationMap = {};
	const allValidLocale = Object.keys(Locale);
	for (const lg in TRANSLATIONS) {
		if (lg === "EnglishUS") continue;
		if (!allValidLocale.includes(lg as Locale)) continue;
		if (Object.prototype.hasOwnProperty.call(TRANSLATIONS, lg)) {
			const translation = TRANSLATIONS[lg as keyof typeof TRANSLATIONS];
			//get the translation string with the key
			//key can be, for example, help.description
			const localValue = Locale[lg as keyof typeof Locale];
			localized[localValue] = getTranslation(key, translation);
		}
	}
	return localized;
}