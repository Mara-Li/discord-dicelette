import { writeFile, existsSync, readFile, readFileSync } from "fs";
import Enmap from "enmap";

const pck = JSON.parse(readFileSync('./package.json', 'utf8'));

if (pck.devDependencies.enmap.includes("5")) {
	const enmap = new Enmap({ name: 'settings' });

	writeFile('./export.json', enmap.export(), () => {
	// I hope the data was in fact saved, because we're deleting it! Double-check your backup file size.
	enmap.clear();
	});
} else if (existsSync("./export.json")) {
	const enmap = new Enmap({ name: 'settings' });
	readFile('./export.json', (err, data) => {
		enmap.import(data);
	});
} else {
	console.error("No export file found. Please run the script with the Enmap v5 version first.");
}