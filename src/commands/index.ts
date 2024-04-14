
import { autoRole } from "./admin/auto_role";
import {changeThread, disableThread,logs } from "./admin/change_channel";
import { deleteChar } from "./admin/delete_char";
import {generateTemplate,registerTemplate } from "./admin/template";
import { delete_after } from "./admin/timer";
import { displayUser } from "./gimmick/display";
import { graph } from "./gimmick/graph";
import { help } from "./help";
import { diceRoll,newScene } from "./rolls/base_roll";
import { dmgRoll } from "./rolls/dbAtq";
import { rollForUser } from "./rolls/dbroll";
import { mjRoll } from "./rolls/mj_roll";

export const autCompleteCmd = [rollForUser, dmgRoll, displayUser, graph, deleteChar, mjRoll];
export const commandsList = [diceRoll, newScene, help, generateTemplate, registerTemplate, rollForUser, logs, dmgRoll, displayUser, graph, changeThread, deleteChar, autoRole, mjRoll, disableThread, delete_after];
