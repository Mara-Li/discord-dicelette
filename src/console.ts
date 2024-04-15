import chalk from "chalk";

/**
 * Extends console.error with a red background and red text
 * @param message {unknown}
 * @param optionalParams {unknown[]}
 */
export const error = (message?: unknown, ...optionalParams: unknown[]) => { 
	console.error(chalk.bgRed("ERROR"), chalk.red(message, ...optionalParams));
};

/**
 * Extends console.warn with a yellow background and yellow text
 * @param message {unknown}
 * @param optionalParams {unknown[]}
 */
export const warn = (message?: unknown, ...optionalParams: unknown[]) => { 
	console.warn(chalk.bgYellow("WARNING"), chalk.yellow(message, ...optionalParams));
};

/**
 * Extends console.log with a blue background and blue text
 * @param message {unknown}
 * @param optionalParams {unknown[]}
 */
export const log = (message?: unknown, ...optionalParams: unknown[]) => { 
	console.log(chalk.bgBlue("INFO"), chalk.blue(message, ...optionalParams));
};

export const success = (message?: unknown, ...optionalParams: unknown[]) => {
	console.log(chalk.bgGreen(message, ...optionalParams));
};

export const dev = (message?: unknown, ...optionalParams: unknown[]) => {
	if (process.env.NODE_ENV !== "development") return;
	console.log(message, ...optionalParams);
};