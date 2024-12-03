import { resources } from "@dicelette/localization";
import { logger } from "@dicelette/utils";
import dotenv from "dotenv";
import i18next from "i18next";
import "uniformize";

await i18next.init({
	lng: "en",
	fallbackLng: "en",
	returnNull: false,
	resources,
});
dotenv.config({ path: ".env" });
logger.info("Starting bot...");
//@ts-ignore
export const VERSION = process.env.npm_package_version ?? "/";
