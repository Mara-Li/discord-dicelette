import { diceRoll, newScene } from "./base_roll";
import { dbd } from "./dbAtq";
import { dbRoll } from "./dbroll";
import { mjRoll } from "./mj_roll";

export const ROLL_AUTO = [dbRoll, dbd, mjRoll];
export const ROLL_CMDLIST = [diceRoll, newScene];