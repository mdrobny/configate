import type {
	DeepPartial,
	DefaultConfig,
	Environment,
	FileExtension,
} from './common.ts';
import { deepMerge } from './deepMerge.ts';
import { importConfigFile } from './importConfigFile.ts';

/**
 * Import multiple config files in defined order and merge them deeply together
 */
export async function importConfigFiles<Config extends DefaultConfig>({
	configDir,
	environment,
	fileExtensions,
}: ImportConfigFilesOptions): Promise<DefaultConfig> {
	/** default.ext **/
	const defaultConfig = await importConfigFile<Config>({
		filePath: `${configDir}/default`,
		fileExtensions,
		shouldThrowError: true,
	});

	/** {environment}.ext **/
	let envConfig: DeepPartial<Config> | undefined;
	if (environment) {
		try {
			envConfig = await importConfigFile<DeepPartial<Config>>({
				filePath: `${configDir}/${environment}`,
				fileExtensions,
				shouldThrowError: true,
			});
		} catch (_error) {
			console.warn(
				`Environment ${environment} defined but no config file found`,
			);
		}
	}

	/** local.ext **/
	const localConfig = await importConfigFile<Config>({
		filePath: `${configDir}/local`,
		fileExtensions,
	});

	/** local-{environment}.ext **/
	const localEnvConfig = environment
		? await importConfigFile<Config>({
				filePath: `${configDir}/local-${environment}`,
				fileExtensions,
			})
		: {};

	/** custom-environment-variables.ext **/
	const customEnvVarsConfig = await importConfigFile<Config>({
		filePath: `${configDir}/custom-environment-variables`,
		fileExtensions: fileExtensions.filter((ext) => ext !== 'json'), // JSON not supported because it cannot use `process.env`
	});

	return deepMerge<Config>(
		structuredClone(defaultConfig),
		structuredClone(envConfig ?? {}),
		structuredClone(localConfig),
		structuredClone(localEnvConfig),
		structuredClone(customEnvVarsConfig),
	) as Config;
}

type ImportConfigFilesOptions = {
	configDir: string;
	environment?: Environment;
	fileExtensions: FileExtension[];
};
