import type { DeepPartial } from '../../../src/common.ts';
import type { Config } from '../src/config.ts';

export const config: DeepPartial<Config> = {
    textFromEnvVar: process.env.TEXT_FROM_ENV_VAR,
};
