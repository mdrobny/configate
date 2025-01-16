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
});

// biome-ignore lint/suspicious/noExportsInTest: <explanation>
export type TestConfig = {
	shallowProperty: string;
	nestedObject: {
		nestedProperty1: string;
		nestedProperty2: string;
	};
};
