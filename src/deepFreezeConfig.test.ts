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

    it('makes Set and Map read-only', () => {
        const config = deepFreezeConfig({
            s: new Set(['a']),
            m: new Map([['k', { label: 'original' }]]),
            list: [new Set([1])],
        });

        assert(config.s instanceof Set);
        assert(config.m instanceof Map);
        assert(Object.isFrozen(config.s));
        assert(Object.isFrozen(config.m));
        assert(Object.isFrozen(config.m.get('k')));

        assert.throws(() => config.s.add('b'), TypeError);
        assert.throws(() => config.s.delete('a'), TypeError);
        assert.throws(() => config.s.clear(), TypeError);
        assert.throws(() => config.m.set('x', { label: 'x' }), TypeError);
        assert.throws(() => config.m.delete('k'), TypeError);
        assert.throws(() => config.m.clear(), TypeError);
        assert.throws(() => config.list[0].add(2), TypeError);

        assert.equal(config.s.has('a'), true);
        assert.equal(config.m.get('k')?.label, 'original');
        assert.deepEqual([...config.s], ['a']);
    });

    it('makes Date read-only', () => {
        const config = deepFreezeConfig({
            d: new Date('2020-01-01T00:00:00.000Z'),
            list: [new Date(0)],
            m: new Map([['k', new Date(0)]]),
        });

        assert(config.d instanceof Date);
        assert(Object.isFrozen(config.d));
        assert.throws(() => config.d.setTime(1), TypeError);
        assert.throws(() => config.d.setFullYear(2000), TypeError);
        assert.throws(() => config.d.setUTCHours(1), TypeError);
        assert.throws(() => config.list[0].setTime(1), TypeError);
        assert.throws(() => config.m.get('k')?.setTime(1), TypeError);

        assert.equal(config.d.toISOString(), '2020-01-01T00:00:00.000Z');
        assert.equal(config.list[0].getTime(), 0);
    });
});
