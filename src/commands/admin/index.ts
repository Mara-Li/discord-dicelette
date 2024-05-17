import { adminConfig } from "./adminConfig";
import { bulkAdd, bulkAddTemplate } from "./bulk_add";
import {generateTemplate, registerTemplate } from "./template";

export const admin = [adminConfig, generateTemplate, registerTemplate, bulkAdd, bulkAddTemplate];