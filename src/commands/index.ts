import { deleteChar } from "./admin/delete_char";
import { ADMIN } from "./admin/index";
import { GIMMICK } from "./gimmick/index";
import { help } from "./help";
import { ROLL_AUTO, ROLL_CMDLIST } from "./rolls/index";
export const autCompleteCmd = [...ROLL_AUTO, ...GIMMICK, deleteChar];
export const commandsList = [
	...ROLL_AUTO,
	...ROLL_CMDLIST,
	...GIMMICK,
	...ADMIN,
	deleteChar,
	help,
];
