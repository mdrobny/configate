import { type DefaultConfig, isPlainObject } from './common.ts';

/**
 * Use Object.freeze to make the config object immutable
 *
 * Set, Map and Date are made read-only as well: Object.freeze alone doesn't stop
 * `add`/`set`/`delete`/`clear` or `setTime`/`setFullYear`/..., so these mutators
 * are replaced with ones that throw a TypeError.
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
    if (value instanceof Date) {
        blockMutators(value, 'Date', dateSetters);
        return Object.freeze(value);
    }
    // Other non-plain objects (class instances) are left untouched
    return value;
}

function blockMutators(
    target: object,
    name: 'Set' | 'Map' | 'Date',
    methods: readonly string[],
): void {
    for (const method of methods) {
        Object.defineProperty(target, method, {
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

/** All Date mutators: setTime, setFullYear, setUTCHours, legacy setYear... */
const dateSetters = Object.getOwnPropertyNames(Date.prototype).filter((name) =>
    name.startsWith('set'),
);
