import i18next from "i18next";
import * as Djs from "discord.js";
import EnglishUS from "./locales/en.json" assert { type: "json" };
import French from "./locales/fr.json" assert { type: "json" };

export const resources = {
	en: {
		translation: EnglishUS,
	},
	fr: {
		translation: French,
	},
};

// noinspection JSIgnoredPromiseFromCall
i18next.init({
	lng: "en",
	fallbackLng: "en",
	returnNull: false,
	resources,
});

export enum LocalePrimary {
	// noinspection JSUnusedGlobalSymbols
	French = "Français",
	English = "English",
}

export const localeList = Object.keys(Djs.Locale)
	.map((key) => {
		return {
			name: key,
			value: Djs.Locale[key as keyof typeof Djs.Locale],
		};
	})
	.filter((x) => Object.keys(resources).includes(x.value))
	.map((x) => {
		return {
			name: LocalePrimary[x.name as keyof typeof LocalePrimary],
			value: x.value as Djs.Locale,
		};
	});
localeList.push({ name: LocalePrimary.English, value: Djs.Locale.EnglishUS });
