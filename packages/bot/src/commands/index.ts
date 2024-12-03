import { deleteChar } from "./admin/delete_char";
import { ADMIN } from "./admin/index";
import { ROLL_AUTO, ROLL_CMDLIST } from "./roll";
import { GIMMICK } from "./tools";
export const autCompleteCmd = [...ROLL_AUTO, ...GIMMICK, deleteChar];
export const commandsList = [
	...ROLL_AUTO,
	...ROLL_CMDLIST,
	...GIMMICK,
	...ADMIN,
	deleteChar,
];
