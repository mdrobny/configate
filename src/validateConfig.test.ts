import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { StandardSchemaV1 } from './standardSchema.ts';
import { ConfigValidationError, validateConfig } from './validateConfig.ts';

describe('validateConfig', () => {
    it('returns the validator output value', async () => {
        const schema = makeSchema<{ port: number }>((value) => ({
            value: { port: Number((value as { port: string }).port) },
        }));
        assert.deepEqual(await validateConfig(schema, { port: '3000' }), {
            port: 3000,
        });
    });

    it('supports async validators', async () => {
        const schema = makeSchema<string>(async () => ({ value: 'ok' }));
        assert.equal(await validateConfig(schema, {}), 'ok');
    });

    it('throws ConfigValidationError with formatted paths and issues', async () => {
        const issues = [
            { message: 'Expected number', path: ['server', 'port'] },
            { message: 'Required', path: [{ key: 'list' }, 0, { key: 'id' }] },
            { message: 'Invalid config' },
        ];
        const schema = makeSchema<never>(() => ({ issues }));

        await assert.rejects(validateConfig(schema, {}), (error: unknown) => {
            assert(error instanceof ConfigValidationError);
            assert.deepEqual(error.issues, issues);
            assert.equal(
                error.message,
                [
                    'Config validation failed:',
                    '  - server.port: Expected number',
                    '  - list.0.id: Required',
                    '  - Invalid config',
                ].join('\n'),
            );
            return true;
        });
    });

    function makeSchema<Output>(
        validate: StandardSchemaV1.Props<unknown, Output>['validate'],
    ): StandardSchemaV1<unknown, Output> {
        return { '~standard': { version: 1, vendor: 'test', validate } };
    }
});
