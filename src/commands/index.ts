import { deleteChar } from "./admin/delete_char.js";
import { admin } from "./admin/index.js";
import { gimmick } from "./gimmick/index.js";
import { help } from "./help.js";
import { roll_auto, roll_cmdList } from "./rolls/index.js";

export const autCompleteCmd = [...roll_auto, ...gimmick, deleteChar];
export const commandsList = [...roll_auto, ...roll_cmdList, ...gimmick, ...admin, deleteChar, help
];
