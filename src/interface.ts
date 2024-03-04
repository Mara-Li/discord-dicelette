
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

export interface GuildData {
	[id: string]: {
		templateID: {
			channel: string;
			message: string;
		},
		referenceId: string;
	}
}

export type Statistique = {
	[name: string] : {
		max?: number;
		min?: number;
	}
}

/**
 * Interface of the JSON file that will be send to the bot when using /apply [idChannel] 
 * Use /new to send you a empty template of this interface in JSON format
 * @example
 * diceType: 1d20
 * statistiqueUsage: +
 * comparator: {
 * 	sign: ">="
 * 	value: 20
 * }
 * The dice throw will be 1d20 + statistique that must be >= 20
 * @example
 * diceType: 1d20
 * statistiqueUsage: undefined
 * comparator: {
 * 	sign: "<="
 * 	value: undefined
 * }
 * The dice throw will be 1d20 that must be <= statistique
 */
export interface StatistiqueTemplate {
	statistiques: Statistique[]
	/**
	 * A total can be set, it allows to calculate the total value of a future register member
	 * If the sum of the value > total, the bot will send a message to the user to inform him that the total is exceeded and an error will be thrown
	 */
	total?: number
	/** A dice type in the notation supported by the bot */
	diceType: string
	/**
	 * How the statistique will be used in the notation / calculation
	 * + mean added to the default dice
	 * - mean removed from the default dice
	 * Undefined mean the statistique will be used as comparator based on the comparator.sign value
	 */
	statistiqueUsage?: "+" | "-"
	/**
	 * How the success/echec will be done 
	 */
	comparator: {
		/**
		 * How the dice value will be compared
		 */
		sign : "<" | ">" | ">=" | "<=" | "=" | "!="
		/**
		 * If not defined, the value will be the statistique value of the user
		 * If defined, the dice will be compared this value
		 */
		value?: number
	}
}

/**
 * When a user is registered, a message will be sent in the corresponding channel for the template
 * There after, the "reference message" will be edited by the bot to add the id of the user and a link to the message where is their statistiques
 * When any user roll on a statistique:
 * - The bot will get the content of the `reference_id` message
 * - If the user is in it: the bot will parse the file and get the message link to the JSON statistique file
 * 	- The bot will get the content of the JSON file and parse it to get the statistique of the user
 * 	- Using it, it will roll normally and send the result to the user 
 * - If the user doesn't exists: the bot will send a message to inform the user that he is not registered and roll normally, ignoring the statistique
 */
export interface User {
	userName?: string; //by default, will be the id of the user, if changed to a string, it will be used
	stats: {
		[name: string] : number;
	}[];
}
/**
 * The reference default type for the "reference message" that list every registered user
 * Form of `@mention/character_shortcuts` : `url_message`
 * Note: Reference message will be a JSON file too
 */
export type DefaultReferenceMessage = {
	[id: string] : string;
}

