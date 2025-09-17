export function updateOne<K extends string, V, T extends { [key in K]: V }>(
	key: K,
	value: V,
	updater: (item: T) => T,
): (array: T[]) => T[] {
	return (array: T[]) =>
		array.map((item) => (item[key] === value ? updater(item) : item));
}
