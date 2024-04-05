
import {changeThread, logs } from "./admin/change_channel";
import {generateTemplate,registerTemplate } from "./admin/template";
import { displayUser } from "./gimmick/display";
import { graph } from "./gimmick/graph";
import { diceRoll, help,newScene } from "./rolls/base_roll";
import { dmgRoll } from "./rolls/dbAtq";
import { rollForUser } from "./rolls/dbroll";

export const autCompleteCmd = [rollForUser, dmgRoll, displayUser, graph];
export const commandsList = [diceRoll, newScene, help, generateTemplate, registerTemplate, rollForUser, logs, dmgRoll, displayUser, graph, changeThread];
