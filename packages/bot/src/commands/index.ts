import { deleteChar } from "./admin/delete_char";
import { ADMIN } from "./admin/index";
import { ROLL_AUTO, ROLL_CMDLIST } from "./roll";
import { GIMMICK } from "./tools";
import { help } from "./tools/help";
import newScene from "./tools/new_scene";
export const autCompleteCmd = [...ROLL_AUTO, ...GIMMICK, deleteChar];
export const commandsList = [
	...ROLL_AUTO,
	...ROLL_CMDLIST,
	...GIMMICK,
	...ADMIN,
	deleteChar,
	help,
	newScene,
];
export * from "./context_menus";
export * from "./admin";
export * from "./roll";
export * from "./tools";
