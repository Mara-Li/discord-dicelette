import { diceRoll, newScene } from "./base_roll";
import { dbd } from "./dbAtq";
import { dbRoll } from "./dbroll";
import { mjRoll } from "./mj_roll";

export const roll_auto = [dbRoll, dbd, mjRoll];
export const roll_cmdList = [diceRoll, newScene];