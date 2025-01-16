// biome-ignore lint/suspicious/noExplicitAny: config can have any value
export type DefaultConfig = Record<string, any>;

export type Environment =
	| 'development'
	| 'staging'
	| 'production'
	| 'test'
	| string;
export type FileExtension = 'ts' | 'mts' | 'js' | 'mjs' | 'cjs' | 'json';

export type DeepPartial<T> = T extends object
	? {
			[P in keyof T]?: DeepPartial<T[P]>;
		}
	: T | undefined; // Allow undefined for leaf values

export function isObject(item: unknown): item is object {
	return item !== null && typeof item === 'object' && !Array.isArray(item);
}
