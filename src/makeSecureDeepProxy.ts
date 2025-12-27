import { type DefaultConfig, isObject } from './common.ts';

/**
 * Use Proxy to add custom behavior when accessing properties of the config object
 * Throw an error if the property is not defined in the config
 */
export function makeSecureDeepProxy<T extends DefaultConfig>(config: T): T {
    for (const prop in config) {
        if (isObject(config[prop])) {
            // If it's an object, recursively wrap it
            config[prop] = makeSecureDeepProxy<T[typeof prop]>(config[prop]);
        } else if (Array.isArray(config[prop])) {
            // If it's an array, wrap each element and the array itself
            config[prop] = makeSecureProxy<T[typeof prop]>(
                config[prop].map((item: unknown) =>
                    isObject(item) || Array.isArray(item)
                        ? makeSecureDeepProxy(item)
                        : item,
                ),
            );
        }
    }
    return makeSecureProxy<T>(config);
}

function makeSecureProxy<T extends DefaultConfig>(targetObject: T): T {
    return new Proxy(targetObject, {
        get(target, prop) {
            // Handle Symbol and Array properties
            if (
                typeof prop === 'symbol' ||
                /** Don't throw error when using array methods */
                (Array.isArray(target) && Number.isNaN(Number(prop))) ||
                /** Allow stringifying proxied config (because JSON.stringify calls this method) */
                prop === 'toJSON'
            ) {
                return Reflect.get(target, prop);
            }

            if (!(prop in target)) {
                throw new Error(
                    `Property ${String(prop)} is not defined in the config`,
                );
            }
            return Reflect.get(target, prop);
        },
    });
}
