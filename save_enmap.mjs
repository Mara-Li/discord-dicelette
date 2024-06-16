import Enmap from "enmap";
import { read, readFileSync, writeFile, writeFileSync } from "node:fs";

const enmap = new Enmap({ name: "settings" });

const mapExport = enmap.export();

function isJsonString(str) {
	try {
		JSON.parse(str);
	} catch (e) {
		return false;
	}
	return true;
}

function deepParse(obj) {
	if (typeof obj === 'string' && isJsonString(obj)) {
		return deepParse(JSON.parse(obj));
	} if (Array.isArray(obj)) {
		return obj.map(deepParse);
	} if (obj !== null && typeof obj === 'object') {
		for (const [key, value] of Object.entries(obj)) {
			obj[key] = deepParse(value);
		}
	}
	return obj;
}

const data = deepParse(mapExport);
const json = JSON.stringify(data, null, 2);
console.log(json);
writeFileSync("./export.json", json);