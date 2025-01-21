import { loadConfig } from '../../../src/index.ts';

export const { config } = await loadConfig<Config>();

export type Config = {
    textToDisplay: string;
    textFromEnvVar: string | null;
};
