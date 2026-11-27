import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { deepMerge } from './deepMerge.ts';

describe('deepMerge', () => {
    it('deeply merges two objects', () => {
        type TestConfig = {
            a?: number;
            b: {
                c: number;
                d?: number;
                e?: number;
            };
            f?: number;
        };

        const target: TestConfig = {
            a: 1,
            b: {
                c: 2,
                d: 3,
            },
        };
        const source: TestConfig = {
            b: {
                c: 4,
                e: 5,
            },
            f: 6,
        };

        const result = deepMerge<TestConfig>(target, source);

        assert.deepEqual(
            result,
            {
                a: 1,
                b: {
                    c: 4,
                    d: 3,
                    e: 5,
                },
                f: 6,
            },
            'The objects should be deeply merged',
        );
    });

    it('overrides arrays instead of merging them', () => {
        type TestConfig = {
            a: number[];
        };

        const target: TestConfig = {
            a: [1, 2, 3],
        };
        const source: TestConfig = {
            a: [4, 5, 6],
        };

        const result = deepMerge<TestConfig>(target, source);

        assert.deepEqual(
            result,
            {
                a: [4, 5, 6],
            },
            'Arrays should be overridden, not merged',
        );
    });

    it('overrides Set and Date instead of merging them', () => {
        type TestConfig = {
            s: Set<string>;
            d: Date;
        };

        const target: TestConfig = {
            s: new Set(['a', 'b', 'c']),
            d: new Date('2020-01-01T00:00:00.000Z'),
        };
        const source: TestConfig = {
            s: new Set(['a']),
            d: new Date('2021-01-01T00:00:00.000Z'),
        };

        const result = deepMerge<TestConfig>(target, source);

        assert.deepEqual([...result.s], ['a']);
        assert.equal(result.d.toISOString(), '2021-01-01T00:00:00.000Z');
        assert.equal(result.s, source.s);
    });

    it('merges Maps by key, recursing into plain object values', () => {
        type TestConfig = {
            m: Map<string, { a?: number; b?: number } | number>;
        };

        const original = new Map<string, { a?: number; b?: number } | number>([
            ['x', { a: 1, b: 2 }],
            ['y', 1],
            ['z', 5],
        ]);
        const target: TestConfig = { m: original };
        const source: TestConfig = {
            m: new Map<string, { a?: number; b?: number } | number>([
                ['x', { b: 3 }],
                ['y', 2],
                ['n', 9],
            ]),
        };

        const result = deepMerge<TestConfig>(target, source);

        assert.deepEqual(
            [...result.m],
            [
                ['x', { a: 1, b: 3 }],
                ['y', 2],
                ['z', 5],
                ['n', 9],
            ],
        );
        assert.equal(original.size, 3, 'the original Map is not mutated');
    });

    it('merges nested Maps', () => {
        type TestConfig = { m: Map<string, Map<string, number>> };

        const result = deepMerge<TestConfig>(
            {
                m: new Map([
                    [
                        'x',
                        new Map([
                            ['a', 1],
                            ['b', 2],
                        ]),
                    ],
                ]),
            },
            { m: new Map([['x', new Map([['b', 3]])]]) },
        );

        assert.deepEqual(
            [...(result.m.get('x') ?? [])],
            [
                ['a', 1],
                ['b', 3],
            ],
        );
    });

    it('ignores properties with undefined values', () => {
        type TestConfig = {
            a?: number;
            b?: number;
            c?: number;
        };

        const target: TestConfig = {
            a: 1,
            b: 2,
        };
        const source: TestConfig = {
            b: undefined,
            c: 3,
        };

        const result = deepMerge<TestConfig>(target, source);

        assert.deepEqual(
            result,
            {
                a: 1,
                b: 2,
                c: 3,
            },
            'Properties with undefined values should be ignored',
        );
    });

    it('handles multiple source objects', () => {
        type TestConfig = {
            a?: number;
            b?: number;
            c?: number;
        };

        const target: TestConfig = {
            a: 1,
        };
        const source1: TestConfig = {
            b: 2,
        };
        const source2: TestConfig = {
            c: 3,
        };

        const result = deepMerge<TestConfig>(target, source1, source2);
        assert.deepEqual(
            result,
            {
                a: 1,
                b: 2,
                c: 3,
            },
            'The function should handle multiple source objects',
        );
    });

    it('ignores __proto__ and constructor properties', () => {
        type TestConfig = {
            a?: number;
            b?: number;
            __proto__?: { c: number };
            constructor?: { d: number };
        };

        const target: TestConfig = {
            a: 1,
        };
        const source: TestConfig = {
            b: 2,
            __proto__: { c: 3 },
            constructor: { d: 4 },
        };

        const result = deepMerge<TestConfig>(target, source);

        assert.deepEqual(
            result,
            {
                a: 1,
                b: 2,
            },
            'The __proto__ and constructor properties should be ignored',
        );
    });
});
