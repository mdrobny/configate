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
