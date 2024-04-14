import { admin } from "./admin";
import { deleteChar } from "./admin/delete_char";
import { gimmick } from "./gimmick";
import { help } from "./help";
import { roll_auto, roll_cmdList } from "./rolls";

export const autCompleteCmd = [...roll_auto, ...gimmick, deleteChar];
export const commandsList = [...roll_auto, ...roll_cmdList, ...gimmick, ...admin, deleteChar, help
];
