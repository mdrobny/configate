import type { DefaultConfig, Environment, FileExtension } from './common.ts';
import { deepFreezeConfig } from './deepFreezeConfig.ts';
import { deepMerge } from './deepMerge.ts';
import { importConfigFiles } from './importConfigFiles.ts';
import { makeSecureDeepProxy } from './makeSecureDeepProxy.ts';

/**
 * Config library to load configuration files based on the environment
 *
 * Features:
 * - Load config files in order:
 *     1. default.ext
 *     2. {environment}.ext
 *     4. local.ext
 *     3. local-{environment}.ext
 *     5. custom-environment-variables.ext (only for .ts and .js files)
 * - Throw an error if a property is accessed that is not defined in the config
 * - Freeze the config object to prevent modifications
 * - Supported config file formats: TypeScript (.ts, .mts), JavaScript (.js, .mjs), JSON (.json)
 * - Config file can `export default {}` or `export const config: Config = { ... }`.
 *     - named export is recommended in TS for type safety of the config object
 *
 * @param configDirs - paths to directories where the config files are located. Relative or absolute. Directories are merged in the array order. Default: ['${current-working-directory}/config']
 * @param environment - the environment to load the config for. Default: process.env.NODE_ENV
 * @param fileExtensions - an array of file extensions to use when looking for config files. Configs are loaded in this order. Default: ['ts', 'js']
 * @param throwOnUndefinedProp - throw an error if a property is accessed that is not defined in the config. Default: true
 * @param freezeConfig - freeze the config object to prevent modifications. Default: true
 *
 * @returns a promise that resolves to an object with 2 properties:
 *    - `config` - a secure, frozen object with the loaded config. Throws an error if an undefined property is accessed
 *    - `unsecureConfig` - an unsecure config. May be needed if config is passed directly to some module that wants to read undefined props or modify it
 */
export async function loadConfig<Config extends DefaultConfig>({
	configDirs = [`${process.cwd()}/config`],
	environment = process.env.NODE_ENV,
	fileExtensions = ['ts', 'js'],
	throwOnUndefinedProp = true,
	freezeConfig = true,
}: LoadConfigOptions): Promise<{ config: Config; unsecureConfig: Config }> {
	let mergedConfig = {} as Config;

	for (const configDir of configDirs) {
		const config = await importConfigFiles<Config>({
			configDir,
			environment,
			fileExtensions,
		});

		mergedConfig = deepMerge(mergedConfig, config as Partial<Config>);
	}

	const unsecureConfig = structuredClone(mergedConfig);

	if (throwOnUndefinedProp) {
		mergedConfig = makeSecureDeepProxy(mergedConfig);
	}

	if (freezeConfig) {
		mergedConfig = deepFreezeConfig(mergedConfig);
	}

	return {
		config: mergedConfig as Config,
		unsecureConfig: unsecureConfig as Config,
	};
}

type LoadConfigOptions = {
	configDirs?: string[];
	environment?: Environment;
	fileExtensions?: FileExtension[];
	throwOnUndefinedProp?: boolean;
	freezeConfig?: boolean;
};
