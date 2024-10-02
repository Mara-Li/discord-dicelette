import dotenv from "dotenv";
dotenv.config();
import * as md from "essential-md";
/**
 * Extends console.error with a red background and red text
 * @param message {unknown}
 * @param optionalParams {unknown[]}
 */
export const error = (message?: unknown, ...optionalParams: unknown[]) => {
	//search the function that called this function
	const stack = new Error().stack;
	const caller = stack?.split("\n")[2].trim();
	md.error(`# ${caller}\n`, message, ...optionalParams);
};

/**
 * Extends console.warn with a yellow background and yellow text
 * @param message {unknown}
 * @param optionalParams {unknown[]}
 */
export const warn = (message?: unknown, ...optionalParams: unknown[]) => {
	md.warn(message, ...optionalParams);
};

/**
 * Extends console.log with a blue background and blue text
 * @param message {unknown}
 * @param optionalParams {unknown[]}
 */
export const log = (message?: unknown, ...optionalParams: unknown[]) => {
	if (process.env.NODE_ENV === "production") return;
	md.info(message, ...optionalParams);
};

export const success = (message?: unknown, ...optionalParams: unknown[]) => {
	md.ok(message, ...optionalParams);
};

export const dev = (message?: unknown, ...optionalParams: unknown[]) => {
	if (process.env.NODE_ENV !== "development") return;
	md.log(message, ...optionalParams);
};
