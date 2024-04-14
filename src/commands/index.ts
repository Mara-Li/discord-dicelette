
import { adminConfig } from "./admin/adminConfig";
import { deleteChar } from "./admin/delete_char";
import {generateTemplate, registerTemplate } from "./admin/template";
import { displayUser } from "./gimmick/display";
import { graph } from "./gimmick/graph";
import { help } from "./help";
import { diceRoll, newScene } from "./rolls/base_roll";
import { dbd } from "./rolls/dbAtq";
import { dbRoll } from "./rolls/dbroll";
import { mjRoll } from "./rolls/mj_roll";

export const autCompleteCmd = [dbRoll, dbd, displayUser, graph, deleteChar, mjRoll];
export const commandsList = [diceRoll, newScene, help, generateTemplate, registerTemplate, dbRoll, dbd, displayUser, graph, mjRoll, adminConfig, deleteChar
];
