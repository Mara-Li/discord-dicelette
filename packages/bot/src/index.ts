import { resources } from "@dicelette/localizations";
import i18next from "i18next";
i18next.init({
	lng: "en",
	fallbackLng: "en",
	returnNull: false,
	resources,
});
