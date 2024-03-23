
export interface Resultat {
	dice: string;
	result: string;
	comment?: string;
	compare?: Compare | undefined;
	modifier?: Modifier;
}

export const enum THUMBNAIL {
	DICE = "https://github.com/Lisandra-dev/discord-dicelette/blob/main/assets/dice.png?raw=true",
	TEMPLATE = "https://github.com/Lisandra-dev/discord-dicelette/blob/main/assets/template.png?raw=true",
	STATS = "https://github.com/Lisandra-dev/discord-dicelette/blob/main/assets/player.png?raw=true"
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
	logs?: string,
	templateID: {
		channelId: string;
		messageId: string;
		statsName: string[];
		damageName: string[];
	},
	user: {
		[userID: string]: {
			charName?: string;
			messageId: string;
			damageName?: string[];
		}[]
	}
	
}

export type Statistic = {
	[name: string] : {
		max?: number;
		min?: number;
		combinaison?: string;
	}
}

/**
 * @example
 * diceType: 1d20
 * comparator: {
 * 	sign: ">="
 * 	value: 20
 * 	formula: +$
 * }
 * The dice throw will be 1d20 + statistique that must be >= 20
 * @example
 * diceType: 1d20
 * comparator: {
 * 	sign: "<="
 * }
 * The dice throw will be 1d20 that must be <= statistique
 */
export interface StatisticalTemplate {
	/** Allow to force the user to choose a name for them characters */
	charName?: boolean 
	statistics?: Statistic
	/**
	 * A total can be set, it allows to calculate the total value of a future register member
	 * If the sum of the value > total, the bot will send a message to the user to inform him that the total is exceeded and an error will be thrown
	 * @note statistique that have a formula will be ignored from the total
	 */
	total?: number
	/** A dice type in the notation supported by the bot */
	diceType?: string;
	/**
	 * How the success/echec will be done 
	 */
	critical?: Critical;
	/** Special dice for damage */
	damage?: {
		[name: string]: string;
	}
}

export interface Critical {
		success?: number,
		failure?: number,
}



/**
 * When a user is registered, a message will be sent in the corresponding channel for the template
 * When any user roll on a statistique:
 * - The bot will check the user in the database. 
 * - If it is, it will get the message with the statistique attached:
 * 	- The bot will get the content of the JSON file and parse it to get the statistique of the user
 * 	- Using it, it will roll normally and send the result to the user 
 * - If the user doesn't exists or their stat was deleted: the bot will send a message to inform the user that he is not registered and roll normally, ignoring the statistique/characters (theses will be send into the comments part)
 */
export interface UserData {
	userName?: string; //by default, will be the id of the user, if changed to a string, it will be used
	stats?: {
		[name: string] : number;
	};
	/**
	 * Allow to prevent returning each time to the JSON template for roll
	 */
	template: {
		diceType?: string;
		critical?: Critical;
		
	},
	damage?: {
		[name: string]: string;
	}
}

