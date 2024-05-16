import type { JestConfigWithTsJest } from "ts-jest";
import { pathsToModuleNameMapper } from "ts-jest";
// In the following statement, replace `./tsconfig` with the path to your `tsconfig` file
// which contains the path mapping (ie the `compilerOptions.paths` option):
import { compilerOptions } from "tsconfig.json";
//remove js extension in compilerOptions.paths
interface CompilerOptionsPaths {
  [key: string]: string[];
}

for (const key of Object.keys(compilerOptions.paths)) {
	(compilerOptions.paths as CompilerOptionsPaths)[key] = (compilerOptions.paths as CompilerOptionsPaths)[key].map((path: string) => path.replace(/\.js$/, ""));
}
const jestConfig: JestConfigWithTsJest = {
	// [...]
	roots: ["<rootDir>"],
	modulePaths: [compilerOptions.baseUrl], // <-- This will be set to 'baseUrl' value
	moduleNameMapper: {"^(\\./.*)\\.js$": "$1", ...pathsToModuleNameMapper(compilerOptions.paths)},
	modulePathIgnorePatterns: ["<rootDir>/dist/"],
	verbose: true,
	extensionsToTreatAsEsm: [".ts"],
	//preset: "ts-jest/presets/default-esm-legacy",
	testEnvironment: "node",
	transform: {
		"^.+\\.ts$": [
			"ts-jest",
			{
				useESM: true,
				supportStaticESM: false,
			},
		],
    
	},
  
};

export default jestConfig;