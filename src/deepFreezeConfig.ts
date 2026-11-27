import { type DefaultConfig, isPlainObject } from './common.ts';

/**
 * Use Object.freeze to make the config object immutable
 *
 * Set and Map are made read-only as well: Object.freeze alone doesn't stop
 * `add`/`set`/`delete`/`clear`, so these mutators are replaced with ones that throw a TypeError.
 */
export function deepFreezeConfig<T extends DefaultConfig>(config: T): T {
    for (const key in config) {
        config[key] = freezeValue(config[key]);
    }
    return Object.freeze(config);
}

function freezeValue<V>(value: V): V {
    if (value instanceof Set) {
        for (const item of value) {
            freezeValue(item);
        }
        blockMutators(value, 'Set', ['add', 'delete', 'clear']);
        return Object.freeze(value);
    }
    if (value instanceof Map) {
        for (const [mapKey, mapValue] of value) {
            freezeValue(mapKey);
            freezeValue(mapValue);
        }
        blockMutators(value, 'Map', ['set', 'delete', 'clear']);
        return Object.freeze(value);
    }
    if (isPlainObject(value) || Array.isArray(value)) {
        return deepFreezeConfig(value as DefaultConfig) as V;
    }
    // Other non-plain objects (Date, class instances) are left untouched
    return value;
}

function blockMutators(
    collection: Set<unknown> | Map<unknown, unknown>,
    name: 'Set' | 'Map',
    methods: string[],
): void {
    for (const method of methods) {
        Object.defineProperty(collection, method, {
            value: () => {
                throw new TypeError(
                    `Cannot call ${name}.${method}() on a frozen config ${name}`,
                );
            },
            writable: false,
            configurable: false,
            enumerable: false,
        });
    }
}
