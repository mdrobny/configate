import { type DefaultConfig, isObject } from './common.ts';

/**
 * Use Object.freeze to make the config object immutable
 */
export function deepFreezeConfig<T extends DefaultConfig>(config: T): T {
	for (const key in config) {
		if (isObject(config[key])) {
			config[key] = deepFreezeConfig<T[typeof key]>(config[key]);
		}
	}
	return Object.freeze(config);
}
