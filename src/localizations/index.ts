import { Locale, LocalizationMap } from "discord.js";

import en from "./locales/en";
import fr from "./locales/fr";

export const TRANSLATIONS = {
	fr,
	en
};

export function ln(userLang: Locale) {
	return TRANSLATIONS[userLang as keyof typeof TRANSLATIONS] || TRANSLATIONS.en;
}

export function cmdLn(key: string) {
	const localized: LocalizationMap = {};
	const allValidLocale = Object.values(Locale);
	for (const lg in TRANSLATIONS) {
		if (lg === "en") continue;
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