
import { diceRoll, help,newScene } from "./base";
import { dmgRoll } from "./dbAtq";
import { rollForUser } from "./dbroll";
import { displayUser } from "./display";
import { graph } from "./graph";
import { changeThread,generateTemplate, logs,registerTemplate } from "./register";

export const autCompleteCmd = [rollForUser, dmgRoll, displayUser, graph];
export const commandsList = [diceRoll, newScene, help, generateTemplate, registerTemplate, rollForUser, logs, dmgRoll, displayUser, graph, changeThread];
