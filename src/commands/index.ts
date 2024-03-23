
import { diceRoll, help,newScene } from "./base";
import { dmgRoll } from "./dbAtq";
import { rollForUser } from "./dbroll";
import { displayUser } from "./display";
import { generateTemplate, logs,registerTemplate } from "./register";

export const autCompleteCmd = [rollForUser, dmgRoll, displayUser];
export const commandsList = [diceRoll, newScene, help, generateTemplate, registerTemplate, rollForUser, logs, dmgRoll, displayUser];
