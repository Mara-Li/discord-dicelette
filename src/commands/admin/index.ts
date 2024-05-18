import { adminConfig } from "./adminConfig";
import { exportData } from "./export";
import { bulkAdd, bulkAddTemplate } from "./import";
import {generateTemplate, registerTemplate } from "./template";

export const admin = [adminConfig, generateTemplate, registerTemplate, bulkAdd, bulkAddTemplate, exportData];