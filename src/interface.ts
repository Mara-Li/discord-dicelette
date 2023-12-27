
export interface Resultat {
	dice: string;
	result: string;
	comment?: string;
	compare?: Compare | undefined;
	modifier?: Modifier;
}

export interface Modifier {
	sign?: Sign;
	value: number;
}

export interface Compare {
	sign: "<" | ">" | ">=" | "<=" | "=";
	value: number;
}

export type Sign = "+" | "-" | "*" | "/" | "%" | "^" | "**";