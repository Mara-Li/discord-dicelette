import { Critical } from "./core/core/interface";



export const enum THUMBNAIL {
	DICE = "https://github.com/Lisandra-dev/discord-dicelette/blob/main/assets/dice.png?raw=true",
	TEMPLATE = "https://github.com/Lisandra-dev/discord-dicelette/blob/main/assets/template.png?raw=true",
	STATS = "https://github.com/Lisandra-dev/discord-dicelette/blob/main/assets/player.png?raw=true"
}

export interface GuildData {
	logs?: string,
	managerId: string;
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

