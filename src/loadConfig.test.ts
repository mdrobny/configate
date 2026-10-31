import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import * as v from 'valibot';
import { z } from 'zod';

import { loadConfig } from './loadConfig.ts';
import { ConfigValidationError } from './validateConfig.ts';

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

    it(`freezes arrays while keeping unsecureConfig independent`, async () => {
        const { config, unsecureConfig } = await loadConfig<ArrayTestConfig>({
            configDirs: [`${import.meta.dirname}/testConfigDirs/arrays`],
            throwOnUndefinedProp: true,
        });

        for (const container of [
            config.values,
            config.nested,
            config.nested[0],
            config.nested[0][0],
            config.empty,
        ]) {
            assert(Object.isFrozen(container));
        }
        assert.throws(() => {
            config.values[0] = 3;
        }, TypeError);
        assert.throws(() => {
            config.values.push(3);
        }, TypeError);
        assert.throws(() => {
            config.nested[0][0].label = 'modified';
        }, TypeError);

        assert.deepEqual(
            config.values.map((value) => value * 2),
            [2, 4],
        );
        assert.deepEqual([...config.values], [1, 2]);
        assert.equal(JSON.stringify(config), JSON.stringify(unsecureConfig));

        unsecureConfig.values.push(3);
        unsecureConfig.nested[0][0].label = 'modified';
        unsecureConfig.empty.push(1);
        assert.deepEqual(config.values, [1, 2]);
        assert.equal(config.nested[0][0].label, 'original');
        assert.deepEqual(config.empty, []);
    });

    it(`keeps arrays mutable when freezing is disabled`, async () => {
        const { config } = await loadConfig<ArrayTestConfig>({
            configDirs: [`${import.meta.dirname}/testConfigDirs/arrays`],
            throwOnUndefinedProp: true,
            freezeConfig: false,
        });

        config.values[0] = 3;
        config.values.push(4);
        config.nested[0][0].label = 'modified';
        config.nested[0].push({ label: 'new' });
        config.empty.push(1);
        assert.deepEqual(config.values, [3, 2, 4]);
        assert.deepEqual(config.nested, [
            [{ label: 'modified' }, { label: 'new' }],
        ]);
        assert.deepEqual(config.empty, [1]);
    });

    describe('loadConfig with schema', () => {
        const configDirs = [
            `${import.meta.dirname}/testConfigDirs/environment`,
        ];

        it('validates with a zod schema and infers the config type', async () => {
            const schema = z.object({
                shallowProperty: z.string(),
                nestedObject: z.object({
                    nestedProperty1: z.string(),
                    nestedProperty2: z.string(),
                }),
            });
            const { config } = await loadConfig({ configDirs, schema });
            const nested: string = config.nestedObject.nestedProperty1;
            assert.equal(nested, 'nested1');
            assert.throws(() => {
                // @ts-expect-error test
                config.undefinedProperty;
            }, /Property undefinedProperty is not defined in the config/);
        });

        it('validates with a valibot schema', async () => {
            const schema = v.object({
                shallowProperty: v.string(),
                nestedObject: v.object({
                    nestedProperty1: v.string(),
                    nestedProperty2: v.string(),
                }),
            });
            const { config } = await loadConfig({ configDirs, schema });
            assert.equal(config.shallowProperty, 'shallow');
        });

        it('rejects with ConfigValidationError when config is invalid', async () => {
            const schema = z.object({ shallowProperty: z.number() });
            await assert.rejects(
                loadConfig({ configDirs, schema }),
                (error: unknown) => {
                    assert(error instanceof ConfigValidationError);
                    assert.match(error.message, /Config validation failed:/);
                    assert.match(error.message, /shallowProperty/);
                    return true;
                },
            );
        });

        it('uses schema output (defaults, transforms) in config and unsecureConfig', async () => {
            const schema = z.object({
                shallowProperty: z.string().transform((s) => s.toUpperCase()),
                added: z.number().default(5),
            });
            const { config, unsecureConfig } = await loadConfig({
                configDirs,
                schema,
            });
            assert.equal(config.shallowProperty, 'SHALLOW');
            assert.equal(config.added, 5);
            assert.equal(unsecureConfig.shallowProperty, 'SHALLOW');
            assert.throws(() => {
                config.added = 1;
            }, /Cannot assign to read only property/);
        });

        it('type-checks an explicit generic against the schema output', async () => {
            const schema = z.object({ shallowProperty: z.string() });
            // @ts-expect-error schema output does not match TestConfig
            await loadConfig<TestConfig>({ configDirs, schema });
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

export type ArrayTestConfig = {
    values: number[];
    nested: { label: string }[][];
    empty: number[];
};
