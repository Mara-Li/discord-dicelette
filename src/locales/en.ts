export default {
	help: {
		name: "help",
		description: "Display help",
		message: (rollId: string, sceneId: string) => `
			- </roll:${rollId}> : Roll a dice
			- </scene:${sceneId}> : Create a new scene thread for future rolls, it will also archive all previous scene threads

			[See the documentation for dice notation](<https://dice-roller.github.io/documentation/guide/notation/dice.html>).

			The bot supports also:
			- [Dice group](<https://dice-roller.github.io/documentation/guide/notation/group-rolls.html>)
			- [Modifiers](<https://dice-roller.github.io/documentation/guide/notation/modifiers.html>)
			- [Comments](<https://dice-roller.github.io/documentation/guide/notation/roll-descriptions.html>)
			- [Mathematics](<https://dice-roller.github.io/documentation/guide/notation/maths.html>)
			- And also "bulk rolls" (roll multiple dice in same time) using the syntax: \`[dice number]#[dice]\`, for example \`2#d6\` to throw 2 6-sided dice.

			More over, you can use the bot directly dice in a message (**without using a slash commands**), using :
			- Direct: \`dice\`, like \`d6\` or \`2d6\`
			- Undirect : \`my message content [dice]\`, like \`*Phibi jump on Wumpus and inflict [2d6] damage*\`.
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
		underscore: "__New scene__:"
	},
	roll: {
		name: "roll",
		description: "Roll a dice",
		option: {
			name: "dice",
			description: "Dice to roll",
		},
		noDice: "No dice provided",
		noValidDice: "Error: Invalid dice",
		reason: "New roll thread",
	}
}