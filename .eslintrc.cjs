module.exports = {
	env: {
		browser: true,
		es2021: true,
		node: true,
	},
	root: true,
	extends: [
		"@lisandra-dev/eslint-config",
		"plugin:json/recommended",
	],
	rules: {
		"@typescript-eslint/ban-ts-comment": "off",
		"unused-imports/no-unused-imports": "warn",
		"no-unused-vars": "warn",
	}
};
