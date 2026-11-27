// biome-ignore lint/suspicious/noExplicitAny: config can have any value
export type DefaultConfig = Record<string, any>;

/**
 * Environment type represents all allowed application environments
 * string is also allowed to support custom environments
 */
export type Environment =
    | 'development'
    | 'staging'
    | 'production'
    | 'test'
    | string;

/**
 * FileExtension type represents all allowed file extensions of config files
 */
export type FileExtension = 'ts' | 'mts' | 'js' | 'mjs' | 'cjs' | 'json';

/**
 * DeepPartial allows to make all properties of an object optional recursively
 *
 * @example
 * ```ts
 * type PartialConfig = DeepPartial<YourConfigStructure>
 * ```
 */
export type DeepPartial<T> = T extends object
    ? {
          [P in keyof T]?: DeepPartial<T[P]>;
      }
    : T | undefined; // Allow undefined for leaf values

/**
 * True only for plain objects (`{}` literals and `Object.create(null)`).
 * Arrays, Set, Map, Date, RegExp and class instances are not plain objects.
 */
export function isPlainObject(item: unknown): item is Record<string, unknown> {
    if (item === null || typeof item !== 'object') {
        return false;
    }
    const proto = Object.getPrototypeOf(item);
    return proto === Object.prototype || proto === null;
}
