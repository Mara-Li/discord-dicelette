import type { Settings } from "@interface";
import color from "ansi-colors";
import { Command, Option, type OptionValues } from "commander";
import Enmap from "enmap";
import { writeFileSync } from "node:fs";
import { colorize as colorizeJson } from "json-colorizer";

//extends console to add console.error with color
// biome-ignore lint/suspicious/noExplicitAny: <explanation>
const error = (message?: any, ...optionalParams: any[]) => {
	console.error("❌", color.red.bold(message), ...optionalParams);
};

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
const success = (message?: any, ...optionalParams: any[]) => {
	console.log("✅", color.green(message), optionalParams);
};

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
const header = (message?: any) => {
	return color.bold.underline(message);
};

const myParseArray = (value: string) => {
	return value.includes(",") ? value.split(/, ?/) : value;
};

const program = new Command();
program
	.addOption(new Option("-g, --guild <id>", "Guild ID to manage"))
	.addOption(new Option("-u, --user <id>", "User ID to manage"))
	.addCommand(
		new Command("get").description("Get data from the database").action(function (
			this: Command
		) {
			// Add type annotation for 'this'
			getData(this.optsWithGlobals());
		})
	)
	.addCommand(
		new Command("delete").description("Delete data from the database").action(function (
			this: Command
		) {
			deleteData(this.optsWithGlobals());
		})
	)
	.addCommand(
		new Command("edit-guild")
			.description("Edit guild data in the database")
			.addOption(new Option("-k, --key <key>", "Key to set"))
			.addOption(new Option("-v, --value <value>", "Value to set"))
			.action(function (this: Command) {
				const opt = this.optsWithGlobals();
				editGuildData(opt.guild, opt.key, opt.value);
			})
	)
	.addCommand(
		new Command("edit-user")
			.description("Edit user data in the database")
			.addOption(new Option("-k, --key <key>", "Key to set"))
			.addOption(new Option("-v, --value <value>", "Value to set"))
			.addOption(new Option("-c, --charName <charName>", "Character name to edit"))
			.action(function (this: Command) {
				const options = this.optsWithGlobals();
				editUserData(
					options.guild,
					options.user,
					options.key,
					options.value,
					options.charName
				);
			})
	);

const db = new Enmap({
	name: "settings",
}) as Settings;

program.parse();

function deleteAnUser(userId: string) {
	const entries = db.entries();
	if (Object.entries(entries).length === 0) {
		error("No data found.");
		return;
	}
	for (const [key, value] of entries) {
		if (value?.user?.[userId]) {
			db.delete(key, `user.${userId}`);
			success(`Deleted data for user ${userId} in guild ${key}`);
		}
	}
}

function readAll() {
	const entries = db.entries();
	if (Object.entries(entries).length === 0) {
		error("No data found.");
		return;
	}
	for (const [key, value] of entries) {
		console.log(`Guild id: ${header(`${key}`)}`);
		console.log(colorizeJson(JSON.stringify(value, null, 2)));
	}
}

function getGuild(guildId: string) {
	const guild = db.get(guildId);
	console.log("Guild data for :", header(guildId));
	if (!guild) {
		error(`No data found for guild ${guildId}`);
		return;
	}
	console.log(colorizeJson(JSON.stringify(guild, null, 2)));
}

function getDataUser(guildId: string, userId: string) {
	const user = db.get(guildId, userId);
	console.log("User data for :", header(userId));
	if (!user) {
		error(`No data found for user ${userId}`);
		return;
	}
	console.log(colorizeJson(JSON.stringify(user, null, 2)));
}

function getAllDataForUser(userId: string) {
	//search the user in the entire database
	const entries = db.entries();
	if (Object.entries(entries).length === 0) {
		error("No data found.");
		return;
	}
	for (const [key, value] of entries) {
		console.log(`User ${header(userId)} in guild_id ${header(key)}:`);
		if (value?.user?.[userId]) {
			console.log(colorizeJson(JSON.stringify(value.user[userId], null, 2)));
		}
	}
}

function editUser(
	guildId: string,
	userId: string,
	key: "charName" | "messageId" | "damageName",
	newValue?: string | string[],
	charName?: string
) {
	const user = db.get(guildId, `user.${userId}`);
	if (!user) {
		error(`No data found for user ${userId}`);
		return;
	}
	//find charName in the user data
	const dataUser = user.find(
		(data) => charName?.standardize() === data?.charName?.standardize()
	);
	const dataIndex = user.findIndex(
		(data) => charName?.standardize() === data?.charName?.standardize()
	);
	if (!dataUser || dataIndex === -1) {
		error(`User ${userId} not found in guild ${guildId} for provided data.`);
		return;
	}
	if (key === "damageName") {
		if (Array.isArray(newValue)) {
			dataUser.damageName = newValue;
		} else {
			error("damageName should be an array.");
			return;
		}
	} else if (key === "messageId" && Array.isArray(newValue)) {
		dataUser[key] = newValue as [string, string];
	} else {
		error("Invalid value provided.");
		return;
	}
	db.set(guildId, dataUser, `user.${userId}.${dataIndex}`);
	success(`Updated data for user ${userId} in guild ${guildId}`);
}

function getData(options: OptionValues) {
	console.log(options);
	if (!options.guild && !options.user) {
		readAll();
	} else if (options.guild && !options.user) {
		getGuild(options.guild);
	} else if (options.guild && options.user) {
		getDataUser(options.guild, options.user);
	} else if (!options.guild && options.user) {
		getAllDataForUser(options.user);
	}
}

function deleteData(options: OptionValues) {
	//create a copy of the database before deleting, in case of accidental deletion
	writeFileSync("./export.json", db.export());

	if (options.guild && !options.user) {
		db.delete(options.guild);
		success(`Deleted data for guild ${options.guild}`);
	} else if (options.guild && options.user) {
		db.delete(options.guild, `user.${options.user}`);
	} else if (!options.guild && options.user) {
		//search in the entire database for the user
		deleteAnUser(options.user);
	}
}

function editGuildData(guildId: string, key: string, value: string) {
	if (!db.has(guildId)) {
		error(`No data found for guild ${guildId}`);
		return;
	}
	db.set(guildId, value, key);
	success(`Updated data for guild ${guildId}`);
}

function editUserData(
	guildId: string,
	userId: string,
	key: string,
	value: string,
	charName: string
) {
	const arrayValue = myParseArray(value);
	if (["charName", "messageId", "damageName"].includes(key)) {
		editUser(
			guildId,
			userId,
			key as "charName" | "messageId" | "damageName",
			arrayValue,
			charName
		);
	} else {
		error("Invalid key provided.");
	}
}
