
export interface Resultat {
	dice: string;
	result: string;
	comment?: string;
	compare?: number;
	modifier?: Modifier;
}

export interface Modifier {
	sign: string;
	value: number;
}