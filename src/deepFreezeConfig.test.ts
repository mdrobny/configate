import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { deepFreezeConfig } from './deepFreezeConfig.ts';

describe('deepFreezeConfig', () => {
    it('should deeply freeze the configuration object', () => {
        const config = {
            shallowProperty: 'shallow',
            nestedObject: {
                nestedProperty1: 'nested1',
                nestedProperty2: 'nested2',
            },
        };

        const frozenConfig = deepFreezeConfig(config);

        assert(
            Object.isFrozen(frozenConfig),
            'The config object itself should be frozen',
        );
        assert(
            Object.isFrozen(frozenConfig.nestedObject),
            'The nested object should be frozen',
        );
        assert.throws(
            () => {
                frozenConfig.nestedObject.nestedProperty1 = 'modified';
            },
            /Cannot assign to read only property/,
            'Should throw an error when modifying a frozen property',
        );
    });

    it('freezes arrays, nested arrays, and their objects', () => {
        const config = deepFreezeConfig({
            values: [1, 2],
            nested: [[{ label: 'original' }]],
            empty: [] as number[],
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
            config.nested[0].push({ label: 'new' });
        }, TypeError);
        assert.throws(() => {
            config.nested[0][0].label = 'modified';
        }, TypeError);
        assert.throws(() => {
            config.empty.push(1);
        }, TypeError);
    });
});
