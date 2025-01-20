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
});
