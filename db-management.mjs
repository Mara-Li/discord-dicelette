import chalk from "chalk";
import { Command, Option } from "commander";
import colorize from "json-colorizer";
import pkg from "sqlite3";

const { Database, OPEN_READWRITE } = pkg;

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
	console.log("Connected to the enmap database.");
});



const options = program.opts();

if (!options) 
	db.serialize(() => {
		db.each("SELECT * FROM settings", (err, row) => {
			if (err) {
				console.error(err.message);
			}
			console.log(`${chalk.underline.green("Guild ID")} : ${row.key}`);
			console.log(`${colorize(row.value, {pretty: true})}`);
		});
	});
else if (options.do === "get") {
	if (!options.guild && !options.user) {
		db.serialize(() => {
			db.each("SELECT * FROM settings", (err, row) => {
				if (err) {
					console.error(err.message);
				}
				console.log(`${chalk.underline.green("Guild ID")} : ${row.key}`);
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
	}
} else if (options.do === "delete") {
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
					console.log(`Deleted user ${options.user} from guild ${options.guild}`);
				});
			});
		});
	}
}	
