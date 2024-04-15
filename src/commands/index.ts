import { deleteChar } from "./admin/delete_char";
import { admin } from "./admin/index";
import { gimmick } from "./gimmick/index";
import { help } from "./help";
import { roll_auto, roll_cmdList } from "./rolls/index";

export const autCompleteCmd = [...roll_auto, ...gimmick, deleteChar];
export const commandsList = [...roll_auto, ...roll_cmdList, ...gimmick, ...admin, deleteChar, help
];
