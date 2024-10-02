declare module "essential-md" {
	export const emd: (...args: any[]) => string;
	export const log: (...args: any[]) => void;
	export const blue: (...args: any[]) => string;
	export const yellow: (...args: any[]) => string;
	export const green: (...args: any[]) => string;
	export const red: (...args: any[]) => string;
	export const error: (...args: any[]) => void;
	export const info: (...args: any[]) => void;
	export const ok: (...args: any[]) => void;
	export const warn: (...args: any[]) => void;
	export const clear: (lines?: number) => void;
	export const prompt: (question: string) => Promise<string>;
}
