import { diceRoll, newScene } from "./base_roll.js";
import { dbd } from "./dbAtq.js";
import { dbRoll } from "./dbroll.js";
import { mjRoll } from "./mj_roll.js";

export const roll_auto = [dbRoll, dbd, mjRoll];
export const roll_cmdList = [diceRoll, newScene];