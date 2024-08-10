Object.defineProperty(String.prototype, "removeAccents", {
	value: function () {
		return this.normalize("NFD").replace(/\p{Diacritic}/gu, "");
	},
	enumerable: false,
});

Object.defineProperty(String.prototype, "standardize", {
	value: function (trim?: boolean) {
		if (trim) return this.removeAccents().toLowerCase().trim();
		return this.removeAccents().toLowerCase();
	},
	enumerable: false,
});

Object.defineProperty(String.prototype, "toTitle", {
	value: function () {
		return this.charAt(0).toUpperCase() + this.slice(1);
	},
	enumerable: false,
});

Object.defineProperty(String.prototype, "capitalize", {
	value: function () {
		return this.replace(/\b\w/g, (char: string) => char.toUpperCase());
	},
	enumerable: false,
});

Object.defineProperty(String.prototype, "subText", {
	value: function (query?: string | null, strict?: boolean) {
		if (strict) return this.standardize(true) === query?.standardize(true);
		return this.standardize(true).includes(query?.standardize(true));
	},
	enumerable: false,
});

Object.defineProperty(String.prototype, "unidecode", {
	value: function (keepAccent?: boolean) {
		if (keepAccent) return this.replaceAll("🔪", "").replaceAll("✏️", "").toLowerCase();
		return this.replaceAll("🔪", "").replaceAll("✏️", "").standardize(true);
	},
	enumerable: false,
});

Object.defineProperty(String.prototype, "removeBacktick", {
	value: function () {
		return this.replace(/`/g, "");
	},
	enumerable: false,
});
