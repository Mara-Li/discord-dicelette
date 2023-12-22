export default {
	help : {
		name: "aide",
		description: "Affiche l'aide",
		message: (rollId: string, sceneId: string) => `
			:game_die: **Dice Roller** :game_die:
			-> Retrouvez le *bot* sur [GitHub](<https://github.com/Lisandra-dev/dice-thread/blob/main/README.fr.md>)

			## Usage
			- </roll:${rollId}> : Lance un dé
			- </scene:${sceneId}> : Crée un nouveau thread pour les dés. Cela archivera tous les threads précédents.

			Vous pouvez utiliser le bot directement dans un message (**sans utiliser de slash commands**), avec :
			- __Un dé direct__ : \`dés\`, comme \`d6\` ou \`2d6\`
			- __Un dé indirect__ : \`mon message [dés]\`, comme \`*Phibi saute sur Wumpus et lui inflige [2d6] dégâts*\`.
			- __Un dé semi-direct__ : \`1d100 mon message\`, comme \`1d100 Phibi saute sur Wumpus et lui inflige des dégâts\`.

			## Notation des dés
			[Voir la documentation pour la notation des dés (en anglais)](<https://dice-roller.github.io/documentation/guide/notation/dice.html>).

			Le bot supporte aussi :
			- [Les groupes de dés](<https://dice-roller.github.io/documentation/guide/notation/group-rolls.html>)
			- [Les modifiers](<https://dice-roller.github.io/documentation/guide/notation/modifiers.html>)
			- [Les commentaires](<https://dice-roller.github.io/documentation/guide/notation/roll-descriptions.html>)
			- [Les mathématiques](<https://dice-roller.github.io/documentation/guide/notation/maths.html>)
			- Ainsi que les "bulk rolls" (lancer plusieurs dés en même temps) avec la notation suivante : \`[nombre de dés]#[dés]\`, comme par exemple \`2#d6\` pour lancer 2 dés à 6 faces.
		`,
	},
	scene: {
		name: "scene",
		description: "Crée un nouveau thread pour les dés",
		option: {
			name: "scene",
			description: "Le nom de la scène",
		},
		noScene: "Aucune scène spécifiée",
		reason: "Nouvelle scène",
		interaction: (scene: string) => `Nouveau thread de scène créé : ${scene}`,
		underscore: "__Nouvelle scène__ :",
		time: {
			name: "tempo",
			description: "Bulle temporelle : replace le dé par une horloge. Par défaut, utilise la date comme nom de thread",
		}
	},
	roll: {
		name: "roll",
		description: "lancer un dé",
		option: {
			name: "dé",
			description: "Dé à lancer",
		},
		noDice: "Aucun dé spécifié",
		noValidDice: "Erreur : Dé invalide",
		reason: "Nouveau thread de lancer",
	}
};