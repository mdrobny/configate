import { type DefaultConfig, isPlainObject } from './common.ts';

/**
 * Custom implementation of deepMerge to avoid using an external dependency
 *
 * - it merges plain objects deeply
 * - it merges Maps by key, like objects
 * - it overrides arrays, Sets and other non-plain objects (Date, class instances), doesn't merge them
 * - it ignores properties with `undefined` values
 */
export function deepMerge<T extends DefaultConfig>(
    target: T,
    ...sources: Array<Partial<T>>
): T {
    for (const source of sources) {
        if (isMergeable(target) && isMergeable(source)) {
            for (const key in source) {
                if (Object.hasOwn(source, key)) {
                    if (key === '__proto__' || key === 'constructor') {
                        continue;
                    }
                    const sourceValue: unknown = source[key];
                    const targetValue: unknown = target[key];

                    if (
                        isPlainObject(sourceValue) &&
                        isPlainObject(targetValue)
                    ) {
                        target[key] = deepMerge(
                            targetValue,
                            sourceValue as Partial<typeof targetValue>,
                        ) as T[Extract<keyof T, string>];
                    } else if (
                        sourceValue instanceof Map &&
                        targetValue instanceof Map
                    ) {
                        target[key] = mergeMaps(
                            targetValue,
                            sourceValue,
                        ) as T[Extract<keyof T, string>];
                    } else if (sourceValue !== undefined) {
                        target[key] = sourceValue as T[Extract<
                            keyof T,
                            string
                        >];
                    }
                }
            }
        }
    }
    return target;
}

/**
 * Returns a new Map: entries of `target` overridden/extended by entries of `source`.
 * Values are merged recursively when both are plain objects (or Maps), otherwise replaced.
 */
function mergeMaps(
    target: Map<unknown, unknown>,
    source: Map<unknown, unknown>,
): Map<unknown, unknown> {
    const result = new Map(target);
    for (const [key, sourceValue] of source) {
        const targetValue = result.get(key);

        if (isPlainObject(sourceValue) && isPlainObject(targetValue)) {
            result.set(key, deepMerge(targetValue, sourceValue));
        } else if (sourceValue instanceof Map && targetValue instanceof Map) {
            result.set(key, mergeMaps(targetValue, sourceValue));
        } else if (sourceValue !== undefined) {
            result.set(key, sourceValue);
        }
    }
    return result;
}

/**
 * Top-level config files are always objects, so only reject null and primitives.
 * Nested values are merged only when both sides are plain objects (see above).
 */
function isMergeable(item: unknown): item is Record<string, unknown> {
    return item !== null && typeof item === 'object';
}
