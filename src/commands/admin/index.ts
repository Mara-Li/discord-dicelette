import { adminConfig } from "./adminConfig.js";
import {generateTemplate, registerTemplate } from "./template.js";

export const admin = [adminConfig, generateTemplate, registerTemplate];