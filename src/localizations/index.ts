import { Locale, LocalizationMap } from "discord.js";

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
			const getTranslation = (key: string) => {
				const keys = key.split(".");
				//keys is now ["help", "description"]
				//get the translation.help.description
				let translationString: string | Record<string, unknown> = translation;
				for (const k of keys) {
					// @ts-ignore
					translationString = translationString[k];
				}
				return translationString as string;
			};
			localized[lg as Locale] = getTranslation(key);
		}
	}
	return localized;
}