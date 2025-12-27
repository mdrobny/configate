import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { makeSecureDeepProxy } from './makeSecureDeepProxy.ts';

describe('makeSecureDeepProxy', () => {
    it('returns a proxy that throws an error for undefined properties', () => {
        const config = {
            a: 1,
            b: {
                c: 2,
            },
        };

        const proxy = makeSecureDeepProxy(config);

        assert.equal(proxy.a, 1);
        assert.equal(proxy.b.c, 2);

        assert.throws(() => {
            // @ts-expect-error
            proxy.b.d;
        }, /Property d is not defined in the config/);
    });

    it('deeply proxies nested objects', () => {
        const config = {
            a: 1,
            b: {
                c: {
                    d: 2,
                },
            },
        };

        const proxy = makeSecureDeepProxy(config);

        assert.equal(proxy.a, 1);
        assert.equal(proxy.b.c.d, 2);

        assert.throws(() => {
            // @ts-expect-error
            proxy.b.c.e;
        }, /Property e is not defined in the config/);
    });

    it('handles multiple levels of nested objects', () => {
        const config = {
            a: {
                b: {
                    c: {
                        d: 1,
                    },
                },
            },
        };

        const proxy = makeSecureDeepProxy(config);

        assert.equal(proxy.a.b.c.d, 1);

        assert.throws(() => {
            // @ts-expect-error
            proxy.a.b.c.e;
        }, /Property e is not defined in the config/);
    });

    it('handles arrays within the config object', () => {
        const config = {
            a: [1, 2, 3],
            b: {
                c: 2,
            },
        };

        const proxy = makeSecureDeepProxy(config);

        assert.deepEqual(proxy.a, [1, 2, 3]);
        assert.equal(proxy.b.c, 2);

        assert.throws(() => {
            proxy.a[3];
        }, /Property 3 is not defined in the config/);

        assert.doesNotThrow(() => {
            [...proxy.a];
            Array.from(proxy.a);

            proxy.a.map((x) => x * 2);

            for (const _item of proxy.a) {
            }

            new Set(proxy.a);
        }, 'Accessing array methods, spreading or using loop should not throw an error');
    });

    it('deeply proxies nested arrays', () => {
        const config = {
            a: [
                [1, 2],
                [3, 4],
            ],
        };

        const proxy = makeSecureDeepProxy(config);

        assert.deepEqual(proxy.a[0], [1, 2]);
        assert.deepEqual(proxy.a[1], [3, 4]);

        assert.equal(proxy.a[0][0], 1);
        assert.equal(proxy.a[0][1], 2);
        assert.equal(proxy.a[1][0], 3);
        assert.equal(proxy.a[1][1], 4);

        assert.throws(() => {
            proxy.a[2];
        }, /Property 2 is not defined in the config/);

        assert.throws(() => {
            proxy.a[0][2];
        }, /Property 2 is not defined in the config/);
    });

    it('handles arrays of objects', () => {
        const config = {
            a: [{ b: 1 }, { c: 2 }],
        };

        const proxy = makeSecureDeepProxy(config);

        assert.equal(proxy.a[0].b, 1);
        assert.equal(proxy.a[1].c, 2);

        assert.throws(() => {
            proxy.a[0].c;
        }, /Property c is not defined in the config/);

        assert.throws(() => {
            proxy.a[1].b;
        }, /Property b is not defined in the config/);
    });

    it('allows JSON.stringify on secure config', () => {
        const config = {
            a: 1,
            nested: { b: 'text' },
        };

        const proxy = makeSecureDeepProxy(config);

        assert.equal(JSON.stringify(proxy), '{"a":1,"nested":{"b":"text"}}');
    });
});
