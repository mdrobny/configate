import { describe, expect, it } from 'bun:test';
import { loadConfig } from '../../../src/index.ts';
import { type Config, config } from './config.ts';

describe('Bun test', () => {
    it('uses default config', async () => {
        expect(config.textToDisplay).toEqual('Default text');
    });

    it('uses environment variable from config', async () => {
        process.env.TEXT_FROM_ENV_VAR = 'Text from env var';

        const { config: testSpecificConfig } = await loadConfig<Config>();

        expect(testSpecificConfig.textFromEnvVar).toEqual('Text from env var');
    });
});
