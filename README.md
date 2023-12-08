# Dice Thread

Allow to throw dice and send the result in a thread.

Use [@diceRoller](https://dice-roller.github.io/) API to throw dice.

It also support the rollem notation `4#(dice)` for bulk rolls.

## Usage

The bot use slash-commands for simplicity.

### Throw dice

`/roll 1d20` for roll.

If there is already a thread created for roll (prefix by `🎲`), the bot will send the log here plus an ephemeral message in the reply.
If there is no thread, the bot will create one and send the log in it.
If the command is used in a thread, the bot will send the log in the thread directly.

> [!NOTE]
> The bot will archive all old threads prefixed by `🎲` if multiple are found and not archived.

### Create a new scene

`/scene <name>`

The bot will create a new thread, prefixed by `🎲`, and send the log in it. The thread will take the `scene` name, and all other thread prefixed by `🎲` will be archived.
