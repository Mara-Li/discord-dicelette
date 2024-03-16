export default {
	help: {
		name: "help",
		description: "Display help",
		message: (rollId: string, sceneId: string) => `
			:game_die: **Dice Roller** :game_die:
			-> Find the *bot* on [GitHub](<https://github.com/Lisandra-dev/dice-thread>)

			## Usage
			- </roll:${rollId}> : Roll a dice
			- </scene:${sceneId}> : Create a new scene thread for future rolls, it will also archive all previous scene threads if they starts with "🎲".
			 You can also create "time bubble" with settings \`/scene bubble:True\`. By default, it will use the date as thread name.

			You can use the bot directly dice in a message (**without using a slash commands**), using :
			- Direct: \`dice\`, like \`d6\` or \`2d6\`
			- Undirect : \`my message content [dice]\`, like \`*Phibi jump on Wumpus and inflict [2d6] damage*\`.
			- Semi-direct : \`1d100 my message content\`, like \`1d100 Phibi jump on Wumpus and inflict damage\`.

			## Dice notation
			[See the documentation for dice notation](<https://dice-roller.github.io/documentation/guide/notation/dice.html>).

			The bot supports also:
			- [Dice group](<https://dice-roller.github.io/documentation/guide/notation/group-rolls.html>)
			- [Modifiers](<https://dice-roller.github.io/documentation/guide/notation/modifiers.html>)
			- [Comments](<https://dice-roller.github.io/documentation/guide/notation/roll-descriptions.html>)
			- [Mathematics](<https://dice-roller.github.io/documentation/guide/notation/maths.html>)
			- And also "bulk rolls" (roll multiple dice in same time) using the syntax: \`[dice number]#[dice]\`, for example \`2#d6\` to throw 2 6-sided dice.

		`,
	},
	scene: {
		name: "scene",
		description: "Create a new thread for the dice",
		option: {
			name: "scene",
			description: "Scene name",
		},
		noScene: "No scene provided",
		reason: "New scene",
		interaction: (scene: string) => `New created thread: ${scene}`,
		underscore: "__New scene__:",
		time: {
			name: "bubble",
			description: "Time bubble: replace the dice by a clock. By default, use the date as thread name",
		}
	},
	roll: {
		name: "roll",
		description: "Roll a dice",
		option: {
			name: "dice",
			description: "Dice to roll",
		},
		noDice: "No dice provided",
		noValidDice: (error: string|undefined, dice: string) => {
			if (error) return `Error: Invalid dice ${dice}\n\`\`\`\n${error}\n\`\`\``;
			return `Error: Invalid dice ${dice}`;
		},
		reason: "New roll thread",
		failure: "Failure",
		success: "Success",
		critical: {
			success: "Critical success",
			failure: "Critical failure"
		}
	},
	generate: {
		name: "generate",
		options: {
			stats:{
				name: "name",
				description: "The name of the statistique, seperate them by a comma or space",
			},
			dice: {
				name: "dice",
				description: "The dice type",
			},
			comparator: {
				name: "comparator",
				description: "The comparator sign between the result and the statistique/a value",
				value: {
					greater: "Greater",
					greaterEqual: "Greater or equal",
					equal: "Equal",
					lessEqual: "Less or equal",
					less: "Lesser",
					different: "Different"
				}
			},
			value: {
				name: "value",
				description: "The value to compare with the dice result. Let empty to compare with the statistical value",
			},
			total: {
				name: "total",
				description: "The total of statistical points (will be calculated when user is registered)",
			},
			character: {
				name: "character",
				description: "Make the character name mandatory for the registration",
			},
			critical_success: {
				name: "critical_success",
				description: "The critical success value (natural dice)",
			},
			critical_fail: {
				name: "critical_fail",
				description: "The critical failure value (natural dice)",
			},
			formula: {
				name: "formula",
				description: "The formula to edit the value. Use $ to symbolise the value (ie: +$)",
			},
			damage: {
				name: "damage",
				description: "Register a damage dice - Separate attack name by coma or space",
			}
		},
		help: `
		- The type of die must be a valid type (it will be tested when you save the model).
		- The value must be a number and can be optional. If you remove it, the die will be compared to the statistic rather than a value.
		- The total must be a number and can be optional. If you remove it, the total will be automatically calculated when the user is saved.
		- The formula allows editing the combined value with the die. Use \`$\` to symbolize the value (e.g., \`+$\`, \`-$\`, \`($-10)/2\`...).
		- A statistic can be a combination of other statistics, such as \`strength+endurance\`. If the \`combination\` value is defined, then the \`min\` and \`max\` parameters will be disabled. Additionally, users will not have to enter the value manually. Finally, this value will be excluded from the calculation of the total allocated points.
		- You can also register a skill dice. This will be used for the skill command from database. Also, user can have their own skill dice.
		
		Note that the file provided here is just an example and should be customized before being saved.

		It is possible to save only skill dice, or nothing at all, if you wish to use only skill dice commands.
		` 
	},
	register: {
		name: "register",
		description: "Register a template for the dbroll command",
		options: {
			channel: "The channel where the template and the users will be saved",			
			template: {
				name: "template",
				description: "The template to register"
			},
		},
		button: "Register a character",
		embed: {
			title: "Template",
			description: "Click on the button to register a new character",
			noValue: "No value set",
			dice: "Dice",
			value: "Value:",
			formula: "Formula:",
			comparator: "Comparator:",
			registered: "Template registered!",
			damage: "Damage dice"
		},
		error: {
			tooMuchStats: "You can't have more than 20 statistics",
			invalid: "Invalid template:"
		}
	},
	dbRoll: {
		name: "dbroll",
		description: "Roll a dice with a registered statistic",
		options: {
			statistic: "The statistic to roll",
			character: "The character where to take value off.",
			comments: {
				name: "comments",
				description: "Comments for the action",
			},
			override: {
				name: "override",
				description: "Override the success threshold",
			},
			modificator: {
				name: "modificator",
				description: "Bonus/malus added to the roll",
			}
		},
	},
	rAtq: {
		name: "dbatk",
		description: "Roll an attack dice",
		atq_name: {
			name: "atq_name",
			description: "The attack name",
		},
	},
	common: {
		total: "Total",
		space: "",
		statistic: "statistic",
		character: "character",
		noSet: "/",
		page: (nb: number) => `Page ${nb}`,
		charName: "Character name",
		user: "Joueur",
		channel: "channel",
		validate: "Validate",
	},
	error: {
		invalidFormula: "Invalid formula for",
		user: "User not found",
		invalidDice: "Invalid dice",
		invalidComparator: "Invalid comparator: missing sign",
		incorrectSign: "Incorrect sign",
		noStat: "No statistic provided",
		onlyCombination: "Only combination was found",
		mustBeLower: (value: string, max: number) => `${value} must be lower than ${max}`,
		mustBeGreater: (value: string, min: number) => `${value} must be greater than ${min}`,
		totalExceededBy: (value: string, max: number) => `The total of ${value} is exceeded by ${max}`,
		noTemplate: "No template or configured channel",
		noThread: "No thread found — Please re-register the user if the thread has been deleted",
		maxGreater: "Max must be greater than min",
		generic: (e: Error) => `An error occured:\n\`\`\`${e.message}\n\`\`\``,
		tooManyDice: "You can't have more than 25 damage dice",
		emptyObject: "You can't have an empty object",
		tooMuchStats: "You can't have more than 20 statistics",
		invalid: "Invalid template:"
	},
	modals: {
		continue: "Continue",
		cancel: "Cancel",
		embedTitle: "Registered user",
		finished: "Stats finished",
		added: "Stats added",
		registering: "Registering User",
		firstPage: (page: number) => `Registering User - Page 1/${page}`,
		steps: (page: number, max: number) => `Registering User - Page ${page}/${max}`,
		charName: {
			name: "charName",
			description: "Enter your character name",
		},
		user: {
			name: "User",
			description: "Enter the user attached to the character (id or global username)",
		},
		alreadySet: "All stats are already set",
		enterValue: (min?: number, max?: number) => {
			if (min && max) return `Enter a value between ${min} and ${max}`;
			if (min) return `Enter a value greater than ${min}`;
			if (max) return `Enter a value lower than ${max}`;
			return "Enter a value";
		},
		register: "Register skill dice",
	},
	logs: {
		name: "logs",
		description: "Set a channel to send error logs",
		options: "The channel where to send the logs",
		set: (channel: string) => `Logs channel set to ${channel}`,
	}
};