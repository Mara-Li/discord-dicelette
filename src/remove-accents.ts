export default function removeAccents(str: string): string {
	return str.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}
