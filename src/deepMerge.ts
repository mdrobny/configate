import { type DefaultConfig, isObject } from './common.ts';

/**
 * Custom implementation of deepMerge to avoid using an external dependency
 *
 * - it merges objects deeply
 * - it overrides array, doesn't merge array elements
 * - it ignores properties with `undefined` values
 */
export function deepMerge<T extends DefaultConfig>(
	target: T,
	...sources: Array<Partial<T>>
): T {
	if (!sources.length) {
		return target;
	}
	const source = sources.shift();

	if (isObject(target) && isObject(source)) {
		for (const key in source) {
			if (Object.prototype.hasOwnProperty.call(source, key)) {
				if (key === '__proto__' || key === 'constructor') {
					continue;
				}
				const sourceValue = source[key];

				if (isObject(sourceValue) && isObject(target[key])) {
					target[key] = deepMerge(target[key], sourceValue);
				} else if (sourceValue !== undefined) {
					(target as T)[key] = sourceValue as T[Extract<keyof T, string>];
				}
			}
		}
	}
	return deepMerge(target, ...sources);
}
