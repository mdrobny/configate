import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { loadConfig } from './loadConfig.ts';

describe('loadConfig', () => {
    it('tries to load config from "current working directory/config" when no options provided', async () => {
        return assert.rejects(
            async () => {
                await loadConfig<TestConfig>();
            },
            (error) => {
                if (error instanceof Error) {
                    assert(
                        error.message.includes(
                            'config/default" not found with any extension: ts, js',
                        ),
                    );
                    return true;
                }
                return false;
            },
        );
    });

    it('loads default config', async () => {
        const { config } = await loadConfig<TestConfig>({
            configDirs: [`${import.meta.dirname}/testConfigDirs/environment`],
        });
        assert.equal(config.shallowProperty, 'shallow');
        assert.equal(config.nestedObject.nestedProperty1, 'nested1');
        assert.equal(config.nestedObject.nestedProperty2, 'nested2');
    });

    it('loads configs from 2 directories', async () => {
        const { config } = await loadConfig<TestConfig>({
            configDirs: [
                `${import.meta.dirname}/testConfigDirs/environment`,
                `${import.meta.dirname}/testConfigDirs/manyExtensions`,
            ],
            environment: 'production',
        });
        assert.equal(config.shallowProperty, 'shallowInTS');
        assert.equal(config.nestedObject.nestedProperty1, 'nested1-production');
        assert.equal(config.nestedObject.nestedProperty2, 'nested2-production');
    });

    it('throws error for undefined property access when throwOnUndefinedProp is true', async () => {
        const { config } = await loadConfig<TestConfig>({
            configDirs: [`${import.meta.dirname}/testConfigDirs/environment`],
            throwOnUndefinedProp: true,
        });
        assert.throws(() => {
            // @ts-expect-error test
            config.undefinedProperty;
        }, /Property undefinedProperty is not defined in the config/);
    });

    it('does not throw error for undefined property access when throwOnUndefinedProp is false', async () => {
        const { config } = await loadConfig<TestConfig>({
            configDirs: [`${import.meta.dirname}/testConfigDirs/environment`],
            throwOnUndefinedProp: false,
        });
        assert.doesNotThrow(() => {
            // @ts-expect-error test
            config.undefinedProperty;
        });
    });

    it('freezes the config object when freezeConfig is true', async () => {
        const { config } = await loadConfig<TestConfig>({
            configDirs: [`${import.meta.dirname}/testConfigDirs/environment`],
            freezeConfig: true,
        });
        assert.throws(() => {
            config.shallowProperty = 'modified';
        }, /Cannot assign to read only property 'shallowProperty'/);
    });

    it('does not freeze the config object when freezeConfig is false', async () => {
        const { config } = await loadConfig<TestConfig>({
            configDirs: [`${import.meta.dirname}/testConfigDirs/environment`],
            freezeConfig: false,
        });
        assert.doesNotThrow(() => {
            config.shallowProperty = 'modified';
        });
    });
});

export type TestConfig = {
    shallowProperty: string;
    nestedObject: {
        nestedProperty1: string;
        nestedProperty2: string;
    };
};
