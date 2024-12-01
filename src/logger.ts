import process from "node:process";
import { type ILogObj, Logger } from "tslog";

const optionLoggers =
	process.env.NODE_ENV === "development"
		? { minLevel: 0 }
		: { minLevel: 4, hideLogPositionForProduction: true };
export const logger: Logger<ILogObj> = new Logger(optionLoggers);
