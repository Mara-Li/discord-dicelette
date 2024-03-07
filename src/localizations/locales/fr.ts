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
			 Vous pouvez aussi créer une "bulle temporelle" avec les paramètres \`/scene tempo:True\`. Par défaut, le nom du thread sera la date du jour.

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
		description: "Lancer un dé",
		option: {
			name: "dé",
			description: "Dé à lancer",
		},
		noDice: "Aucun dé spécifié",
		noValidDice: "Erreur : Dé invalide",
		reason: "Nouveau thread de lancer",
		failure: "Échec",
		success: "Succès",
		critical: {
			success: "Succès critique",
			failure: "Échec critique",
		},
	},
	generate: {
		name: "générer",
		options: {
			stats: {
				name: "nom",
				description: "Le nom de la statistique, séparez-les par un espace ou une virgule",
			},
			dice: {
				name: "dé",
				description: "Le type de dé à lancer",
			},
			comparator: {
				name: "comparateur",
				description: "Le signe du comparateur entre le résultat et la statistique/une valeur",
				value: {
					greater: "Plus grand",
					greaterEqual: "Plus grand ou égal",
					equal: "Égal",
					lessEqual: "Plus petit ou égal",
					less: "Plus petit",
					different: "Différent"
				}
			},
			value: {
				name: "valeur",
				description: "La valeur à comparer avec le résultat du dé. Laissez vide pour comparer avec la statistique",
			},
			total: {
				name: "total",
				description: "Le total des points de statistiques (sera calculé quand l'utilisateur sera enregistré)",
			},
			character: {
				name: "personnage",
				description: "Rendre le nom du personnage obligatoire pour l'enregistrement",
			},
			critical_success: {
				name: "succès_critique",
				description: "Définir un succès critique (dé naturel)",
			},
			critical_fail: {
				name: "échec_critique",
				description: "Définir un échec critique (dé naturel)",
			},
			formula: {
				name: "formule",
				description: "La formule pour modifier la valeur de la statistique. Utiliser $ pour symboliser la valeur (ie: +$)",
			}
		},
		help: `
		- Le type de dé doit être un type valide (il sera testé quand vous enregistrerez le modèle).
		- La valeur doit être un nombre, et peut être optionnel. Si vous l'enlevez, le dé sera comparé à la statistique plutôt qu'une valeur.
		- Le total doit être un nombre, et peut être optionnel. Si vous l'enlevez, le total sera calculé automatiquement quand l'utilisateur sera enregistré.
		- La formule permet d'éditer la valeur combinée au dé. Utiliser \`$\` pour symboliser la valeur (ie: \`+$\`, \`-$\`, \`($-10)/2\`...).
		- Une statistique peut être une combinaison d'autre statistique, comme \`force+endurance\`. Si la valeur de \`combinaison\` est définie, alors que les paramètres \`min\` et \`max\` seront désactivés. De plus, les utilisateurs n'auront pas à entrer la valeur à la main. Enfin, cette valeur sera exclue du calcul du total de point alloué.

		Noter que le fichier proposé ici n'est qu'un exemple et doit être personnalisé avant d'être enregistré.	
		`
	},
	register: {
		name: "enregistrer",
		description: "Enregistre un nouveau modèle pour la commande dbroll",
		options: {
			channel: {
				name: "channel",
				description: "Le channel où le modèle et les utilisateurs seront enregistrés"
			},
			template: {
				name: "template",
				description: "Le modèle à enregistrer"
			}
		},
		button: "Enregistrer un personnage",
		embed: {
			title: "Modèle",
			description: "Clickez sur le bouton pour enregistrer un personnage",
			noValue: "Aucune valeur",
			dice: "Dé",
			value: "Valeur :",
			formula: "Formule :",
			comparator: "Comparateur :",
			registered: "Modèle enregistré !"
		},
		error: {
			tooMuchStats: "Vous ne pouvez pas avoir plus de 20 statistiques",
			invalid: "Modèle invalide : "
		}
	},
	common: {
		total: "Total",
		space: " ",
		statistic: "statistique",
		character: "personnage",
		comments: "commentaires",
		noSet: "/",
		page: (nb: number) => `Page ${nb}`,
	},
	dbRoll: {
		name: "dbroll",
		description: "Lance un dé avec une statistique enregistrée",
		options: {
			statistic: "La statistique à utiliser",
			character: "Le personnage où prendre la valeur.",
			comments: {
				name: "commentaires",
				description: "Description de l'action",
			},
			override: {
				name: "remplacer",
				description: "Remplacer le seuil de réussite",
			},
			modificator: {
				name: "modificateur",
				description: "Bonus/malus ajouté au lancer",
			}
		},
		error: {
			notRegistered: "Vous n'êtes pas enregistré",
		}
	},
	error: {
		invalidFormula: "Formule invalide",
		invalidDice: "Dé invalide",
		user: "Utilisateur introuvable",
		invalidComparator: "Comparateur invalide : signe manquant",
		incorrectSign: "Signe incorrect",
		noStat: "Aucune statistique fournie",
		onlyCombination: "Seule des combinations ont été trouvées",
		mustBeLower: (value: string, max: number) => `La valeur ${value} doit être plus petite que ${max}`,
		mustBeGreater: (value: string, min: number) => `La valeur ${value} doit être plus grande que ${min}`,
		totalExceededBy: (value: string, max: number) => `Le total de ${value} est dépassé de ${max}`,
		noTemplate: "Aucun modèle ou channel configuré",
	},
	modals: {
		continue: "Continuer",
		cancel: "Annuler",
		embedTitle: "Utilisateur enregistré",
		finished: "Statistiques terminées",
		added: "Statistiques ajoutées",
		charName: {
			name: "Nom du personnage",
			description: "Entrez le nom de votre personnage"
		},
		firstPage: (page: number) => `Enregistrement de l'utilisateur - Page 1/${page}`,
		steps: (page: number, max: number) => `Enregistrement de l'utilisateur - Page ${page}/${max}`,
		user: {
			name: "utilisateur",
			description: "Entrez l'utilisateur attaché au personnage (id ou nom d'utilisateur global)"
		},
		alreadySet: "Toutes les statistiques sont déjà définies",
		enterValue: (min?: number, max?: number) => {
			if (min && max) return `Entrez une valeur entre ${min} et ${max}`;
			if (min) return `Entrez une valeur plus grande que ${min}`;
			if (max) return `Entrez une valeur plus petite que ${max}`;
			return "Entrez une valeur";
		},
		
	}
};