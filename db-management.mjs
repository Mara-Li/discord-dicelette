import color from "ansi-colors";
import { Command, Option } from "commander";
import Enmap from "enmap";
import {writeFileSync} from "fs";
import colorizeJson from "json-colorizer";

color.theme({
	danger: color.red,
	dark: color.dim.gray,
	disabled: color.gray,
	em: color.italic,
	heading: color.bold.underline,
	info: color.cyan,
	muted: color.dim,
	primary: color.blue,
	strong: color.bold,
	success: color.green.bold,
	underline: color.underline,
	warning: color.yellow,
	error: color.red.bold,
});

//extends console to add console.error with color
const error = (message) => {
	console.error("❌", color.error(message));
};

const success = (message) => {
	console.log("✅", color.success(message));
};

const program = new Command();
program
	.addOption(new Option("-g, --guild <id>", "Guild ID to manage"))
	.addOption(new Option("-d, --do <action>", "What to do").choices(["get", "set", "delete"]).default("get"))
	.addOption(new Option("-u, --user <id>", "User ID to manage"));

program.parse();

const db = new Enmap({
	name: "settings",
});

const options = program.opts();

function readAll() {
	const entries = db.entries();
	if (entries.length === 0) {
		error("No data found.");
		return;
	}
	for (const [key, value] of entries) {
		console.log(`Guild id: ${color.heading(key)}`);
		console.log(colorizeJson(JSON.stringify(value, null, 2)));
	}
}

function getGuild(guildId) {
	const guild = db.get(guildId);
	console.log("Guild data for :", color.heading(guildId));
	if (!guild) {
		error(`No data found for guild ${guildId}`);
		return;
	}
	console.log(colorizeJson(JSON.stringify(guild, null, 2)));
}

function getDataUser(guildId, userId) {
	const user = db.get(guildId, userId);
	console.log("User data for :", color.heading(userId));
	if (!user) {
		error(`No data found for user ${userId}`);
		return;
	}
	console.log(colorizeJson(JSON.stringify(user, null, 2)));
}

function getAllDataForUser(userId) {
	//search the user in the entire database
	const entries = db.entries();
	if (entries.length === 0) {
		error("No data found.");
		return;
	}
	for (const [key, value] of entries) {
		console.log(`User ${color.heading(userId)} in guild_id ${color.heading(key)}:`);
		if (value?.user?.[userId]) {
			console.log(colorizeJson(JSON.stringify(value.user[userId], null, 2)));
		}
	}
}

if (options.do === "get") {
	if (!options.guild && !options.user) {
		readAll();
	}
	else if (options.guild && !options.user) {
		getGuild(options.guild);
	} else if (options.guild && options.user) {
		getDataUser(options.guild, options.user);
	} else if (!options.guild && options.user) {
		getAllDataForUser(options.user);
		
	}
} else if (options.do === "delete") {
	//create a copy of the database before deleting, in case of accidental deletion
	writeFileSync("./export.json", db.export());
	
	if (options.guild && !options.user) {
		//pass
	} else if (options.guild && options.user) {
		//pass
	}
}	
