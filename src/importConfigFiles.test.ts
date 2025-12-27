import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { importConfigFiles } from './importConfigFiles.ts';

describe('importConfigFiles', () => {
    it('loads environment-specific config', async () => {
        const config = await importConfigFiles({
            configDir: `${import.meta.dirname}/testConfigDirs/environment`,
            environment: 'production',
            fileExtensions: ['ts'],
        });

        assert.equal(config.shallowProperty, 'shallow-production');
        assert.equal(config.nestedObject.nestedProperty1, 'nested1-production');
        assert.equal(config.nestedObject.nestedProperty2, 'nested2-production');
    });

    it('loads custom environment variables config', async () => {
        process.env.SHALLOW_PROPERTY = 'shallow-env-var';

        const config = await importConfigFiles<TestConfig>({
            configDir: `${import.meta.dirname}/testConfigDirs/envVars`,
            fileExtensions: ['ts'],
        });

        assert.equal(config.shallowProperty, process.env.SHALLOW_PROPERTY);

        process.env.SHALLOW_PROPERTY = undefined;
    });

    it('loads variant-specific overrides on top of defaults', async () => {
        const config = await importConfigFiles<TestConfig>({
            configDir: `${import.meta.dirname}/testConfigDirs/variant`,
            variant: 'customerA',
            fileExtensions: ['ts'],
        });

        assert.equal(config.shallowProperty, 'default');
        assert.equal(
            config.nestedObject.nestedProperty1,
            'default-customerA-n1',
        );
        assert.equal(config.nestedObject.nestedProperty2, 'local-customerA-n2');

        const configB = await importConfigFiles<TestConfig>({
            configDir: `${import.meta.dirname}/testConfigDirs/variant`,
            variant: 'customerB',
            fileExtensions: ['ts'],
        });

        assert.equal(configB.shallowProperty, 'default');
        assert.equal(
            configB.nestedObject.nestedProperty1,
            'default-customerB-n1',
        );
    });

    it('prioritizes environment+variant specific files and locals', async () => {
        const config = await importConfigFiles<TestConfig>({
            configDir: `${import.meta.dirname}/testConfigDirs/variant`,
            environment: 'production',
            variant: 'customerA',
            fileExtensions: ['ts'],
        });

        assert.equal(config.shallowProperty, 'local-production');
        assert.equal(
            config.nestedObject.nestedProperty1,
            'default-customerA-n1',
        );
        assert.equal(config.nestedObject.nestedProperty2, 'local-customerA-n2');
    });
});

export type TestConfig = {
    shallowProperty: string;
    nestedObject: {
        nestedProperty1: string;
        nestedProperty2: string;
    };
};
