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
    variant,
    fileExtensions,
}: ImportConfigFilesOptions): Promise<DefaultConfig> {
    /** default.ext **/
    const defaultConfig = await importConfigFile<Config>({
        filePath: `${configDir}/default`,
        fileExtensions,
        shouldThrowError: true,
    });

    /** default-{variant}.ext **/
    let defaultVariantConfig: DeepPartial<Config> | undefined;
    if (variant) {
        defaultVariantConfig = await importConfigFile<DeepPartial<Config>>({
            filePath: `${configDir}/default-${variant}`,
            fileExtensions,
        });
    }

    /** {environment}.ext **/
    let environmentConfig: DeepPartial<Config> | undefined;
    let environmentVariantConfig: DeepPartial<Config> | undefined;
    if (environment) {
        try {
            environmentConfig = await importConfigFile<DeepPartial<Config>>({
                filePath: `${configDir}/${environment}`,
                fileExtensions,
                shouldThrowError: true,
            });
        } catch (_error) {
            console.warn(
                `Environment ${environment} defined but no config file found`,
            );
        }

        /** {environment}-{variant}.ext **/
        if (variant) {
            environmentVariantConfig = await importConfigFile<
                DeepPartial<Config>
            >({
                filePath: `${configDir}/${environment}-${variant}`,
                fileExtensions,
            });
        }
    }

    /** local.ext **/
    const localConfig = await importConfigFile<Config>({
        filePath: `${configDir}/local`,
        fileExtensions,
    });

    /** local-{variant}.ext **/
    let localVariantConfig: DeepPartial<Config> | undefined;
    if (variant) {
        localVariantConfig = await importConfigFile<DeepPartial<Config>>({
            filePath: `${configDir}/local-${variant}`,
            fileExtensions,
        });
    }

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
        structuredClone(defaultVariantConfig ?? {}),
        structuredClone(environmentConfig ?? {}),
        structuredClone(environmentVariantConfig ?? {}),
        structuredClone(localConfig),
        structuredClone(localVariantConfig ?? {}),
        structuredClone(localEnvConfig),
        structuredClone(customEnvVarsConfig),
    ) as Config;
}

type ImportConfigFilesOptions = {
    configDir: string;
    environment?: Environment;
    variant?: string;
    fileExtensions: FileExtension[];
};
