import color from "ansi-colors";
import { Command, Option } from "commander";
import fs from "fs";
import colorize from "json-colorizer";
import { exit } from "process";
import pkg from "sqlite3";

const { Database, OPEN_READWRITE } = pkg;

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
console.error = (message) => {
	console.error("❌", color.error(message));
};

console.success = (message) => {
	console.log("✅", color.success(message));
};

const program = new Command();
program
	.addOption(new Option("-g, --guild <id>", "Guild ID to manage"))
	.addOption(new Option("-d, --do <action>", "What to do").choices(["get", "set", "delete"]).default("get"))
	.addOption(new Option("-u, --user <id>", "User ID to manage"));

program.parse();

const db = new Database("./data/enmap.sqlite", OPEN_READWRITE, (err) => {
	if (err) {
		console.error(err.message);
	}
	console.success("Connected to the enmap database.");
});

const options = program.opts();

if (options.do === "get") {
	if (!options.guild && !options.user) {
		db.serialize(() => {
			db.each("SELECT * FROM settings", (err, row) => {
				if (err) {
					console.error(err.message);
				}
				console.log(`${color.underline.green("Guild ID")} : ${row.key}`);
				console.log(`${colorize(row.value, {pretty: true})}`);
			});
		});
	}
	else if (options.guild && !options.user) {
		db.serialize(() => {
			db.get("SELECT * FROM settings WHERE key = ?", options.guild, (err, row) => {
				if (err) {
					console.error(err.message);
				}
				console.log(`${colorize(row.value, {pretty: true})}`);
			});
		});
	} else if (options.guild && options.user) {
		db.serialize(() => {
			db.get("SELECT * FROM settings WHERE key = ?", options.guild, (err, row) => {
				if (err) {
					console.error(err.message);
				}
				const guildData = JSON.parse(row.value);
				console.log(`${colorize(guildData[options.user], {pretty: true})}`);
			});
		});
	} else if (!options.guild && options.user) {
		//delete all user data in all guilds
		db.serialize(() => {
			db.each("SELECT * FROM settings", (err, row) => {
				if (err) {
					console.error(err.message);
				}
				const guildData = JSON.parse(row.value);
				delete guildData[options.user];
				db.run("UPDATE settings SET value = ? WHERE key = ?", [JSON.stringify(guildData), row.key], (err) => {
					if (err) {
						console.error(err.message);
					}
					console.success(`Deleted user ${color.grey(options.user)} from guild ${color.grey(row.key)}`);
				});
			});
		});
	}
} else if (options.do === "delete") {
	//create a copy of the database before deleting, in case of accidental deletion
	fs.copyFileSync("./data/enmap.sqlite", `./data/enmap.sqlite.${Date.now()}.bak`, (err) => {
		if (err) {
			console.error(err.message);
			exit(1);
		}
		console.log(color.green("💾 Created a backup of the database."));
	});
	if (options.guild && !options.user) {
		db.serialize(() => {
			db.run("DELETE FROM settings WHERE key = ?", options.guild, (err) => {
				if (err) {
					console.error(err.message);
				}
				console.log(`Deleted guild ${options.guild}`);
			});
		});
	} else if (options.guild && options.user) {
		db.serialize(() => {
			db.get("SELECT * FROM settings WHERE key = ?", options.guild, (err, row) => {
				if (err) {
					console.error(err.message);
				}
				const guildData = JSON.parse(row.value);
				delete guildData[options.user];
				db.run("UPDATE settings SET value = ? WHERE key = ?", [JSON.stringify(guildData), options.guild], (err) => {
					if (err) {
						console.error(err.message);
					}
					console.success(`Deleted user ${options.user} from guild ${options.guild}`);
				});
			});
		});
	}
}	
