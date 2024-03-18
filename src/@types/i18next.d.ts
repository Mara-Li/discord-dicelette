import { resources } from "../localizations/index";

declare module "i18next" {
    interface CustomTypeOptions {
        readonly resources: typeof resources["en"];
        readonly returnNull: false
    }
}