export default {
	help : {
		name: "aide",
		description: "Affiche l'aide",
		message: (rollId: string, sceneId: string) => `
			- </roll:${rollId}> : Lance un dé
			- </scene:${sceneId}> : Crée un nouveau thread pour les dés. Cela archivera tous les threads précédents.

			[Voir la documentation pour la notation des dés (en anglais)](https://dice-roller.github.io/documentation/guide/notation/dice.html).

			Le bot supporte aussi :
			- [Les groupes de dés](https://dice-roller.github.io/documentation/guide/notation/group-rolls.html)
			- [Les modifiers](https://dice-roller.github.io/documentation/guide/notation/modifiers.html)
			- [Les commentaires](https://dice-roller.github.io/documentation/guide/notation/roll-descriptions.html)
			- [Les mathématiques](https://dice-roller.github.io/documentation/guide/notation/maths.html)
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
		underscore: "__Nouvelle scène__ :"
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
}