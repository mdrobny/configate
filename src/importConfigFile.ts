import fs from 'node:fs/promises';
import type { DefaultConfig, FileExtension } from './common.ts';

export async function importConfigFile<Config extends DefaultConfig>({
    filePath,
    fileExtensions,
    shouldThrowError = false,
}: {
    filePath: string;
    fileExtensions: FileExtension[];
    shouldThrowError?: boolean;
}): Promise<Config> {
    let selectedExtension: FileExtension | undefined;

    for (const ext of fileExtensions) {
        try {
            // Quickly check if the file exists to avoid unnecessary parsing in import()
            await fs.access(`${filePath}.${ext}`, fs.constants.R_OK);
            selectedExtension = ext;
            break;
        } catch (_error) {}
    }

    if (!selectedExtension) {
        if (shouldThrowError) {
            throw new Error(
                `Config file "${filePath}" not found with any extension: ${fileExtensions.join(', ')}`,
            );
        }
        return {} as Config;
    }

    const importOptions =
        selectedExtension === 'json' ? { with: { type: 'json' } } : undefined;

    try {
        const configFile = await import(
            `${filePath}.${selectedExtension}?cacheBuster=${Math.random()}`,
            importOptions
        );
        // Named export of `config` variable is preferred over default export
        if (configFile.config) {
            return configFile.config as Config;
        }
        if (configFile.default) {
            return configFile.default as Config;
        }
        throw new Error(
            `Config file "${filePath}" has no default export and does not have export "config"`,
        );
    } catch (error) {
        if (shouldThrowError) {
            throw error;
        }
        return {} as Config;
    }
}
