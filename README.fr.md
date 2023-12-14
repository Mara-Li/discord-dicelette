# Dice Thread

Permet de lancer des dés et d'envoyer le résultat dans un fil de discussion.

Utilise l'API [@diceRoller](https://dice-roller.github.io/documentation/) pour lancer les dés.

Il prend également en charge la notation rollem `4#(dés)` pour les lancers "en masse" (bulk roll).

[Invitez le bot](https://discord.com/api/oauth2/authorize?client_id=1182819335878754385&permissions=395137215504&scope=bot+applications.commands)

## Comportement
### Logs dans des threads

Le bot fonctionne avec des threads. Lors du premier lancer, il recherchera un fil préfixé par `🎲`.
- Si le fil n'existe pas, un nouveau sera créé et tous les futurs logs y seront envoyés.
- S'il existe déjà un fil, il prendra le plus récent et enverra les logs dedans.

> [!NOTE]
> Si plusieurs fils sont trouvés, le bot utilisera le plus récent et archivera les autres.

Les commandes peuvent également fonctionner dans un fil. Dans ce cas, le bot y enverra simplement le résultat.

Il est également possible de créer un nouveau fil avec la commande [Créer une nouvelle scène](#créer-une-nouvelle-scène).

### Canaux

Le bot enverra **également** le résultat dans le canal où la commande a été envoyée. Le message :
- Sera supprimé après 3 minutes
- Contiendra un lien vers le message dans le log.

## Utilisation

Le bot peut être :
- Utilisé avec des slash-commands (voir [Slashcommands](#slashcommands))
- Mais aussi directement sur le message.

### Envoi de message

Le message détectera la notation des dés et enverra le résultat.

La notation des dés peut être faite de deux manières :
- Directe, comme `1d20` : Dans ce cas, le message "commandes" sera supprimé et le résultat sera envoyé dans le même canal (et dans le log).
- Indirecte, entre crochets, comme : `mon contenu de message [1d20]`. Dans ce cas, le message sera conservé, et le contenu des crochets sera lancé. Vous recevrez une réponse avec le résultat et le log sera envoyé dans le fil. Les logs contiendront un lien vers le message d'origine.

### Slashcommands
#### Lancer les dés

`/roll 1d20` pour lancer.

#### Créer une nouvelle scène

`/scene <nom>`

Le bot créera un nouveau fil de discussion, préfixé par `🎲`, et enverra le journal dedans. Le fil prendra le nom de la `scène`, et tous les autres fils préfixés par `🎲` seront archivés.

#### Aide

`/help` : Affiche le message d'aide.