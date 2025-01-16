import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { importConfigFile } from './importConfigFile.ts';

describe('importConfigFile', () => {
	it('imports a JSON config file', async () => {
		const config = await importConfigFile({
			filePath: `${import.meta.dirname}/testConfigDirs/manyExtensions/testConfigFile`,
			fileExtensions: ['json'],
		});

		assert.deepEqual(config, { shallowProperty: 'shallowInJSON' });
	});

	it('imports a TypeScript config file', async () => {
		const config = await importConfigFile({
			filePath: `${import.meta.dirname}/testConfigDirs/manyExtensions/testConfigFile`,
			fileExtensions: ['ts'],
		});

		assert.deepEqual(config, { shallowProperty: 'shallowInTS' });
	});

	it('imports config with extension that has highest priority in "fileExtensions" param', async () => {
		const config = await importConfigFile({
			filePath: `${import.meta.dirname}/testConfigDirs/manyExtensions/testConfigFile`,
			fileExtensions: ['json', 'ts'],
		});

		assert.deepEqual(config, { shallowProperty: 'shallowInJSON' });

		const config2 = await importConfigFile({
			filePath: `${import.meta.dirname}/testConfigDirs/manyExtensions/testConfigFile`,
			fileExtensions: ['js', 'json', 'ts'],
		});

		assert.deepEqual(config2, { shallowProperty: 'shallowInJS' });

		const config3 = await importConfigFile({
			filePath: `${import.meta.dirname}/testConfigDirs/manyExtensions/testConfigFile`,
			fileExtensions: ['ts', 'json', 'js'],
		});

		assert.deepEqual(config3, { shallowProperty: 'shallowInTS' });
	});

	it('imports a CommonJS config file', async () => {
		const config = await importConfigFile({
			filePath: `${import.meta.dirname}/testConfigDirs/commonJs/default`,
			fileExtensions: ['cjs'],
		});

		assert.deepEqual(config, { shallowProperty: 'shallowInCJS' });
	});

	it('throws an error if the config file is not found with any extension', async () => {
		await assert.rejects(
			async () => {
				await importConfigFile({
					filePath: `${import.meta.dirname}/testConfigDirs/manyExtensions/nonExistentFile`,
					fileExtensions: ['json'],
					shouldThrowError: true,
				});
			},
			{
				message: /Config file ".*" not found with any extension: json/,
			},
		);
	});

	it('throws an error if the config file is invalid or returns {} when should not throw', async () => {
		await assert.rejects(
			async () => {
				await importConfigFile({
					filePath: `${import.meta.dirname}/testConfigDirs/manyExtensions/invalidConfig`,
					fileExtensions: ['js'],
					shouldThrowError: true,
				});
			},
			(error) => {
				assert(error instanceof TypeError, 'Error should be a TypeError');
				assert(error.message.includes('Cannot read properties of undefined'));
				return true;
			},
		);

		const config = await importConfigFile({
			filePath: `${import.meta.dirname}/testConfigDirs/manyExtensions/invalidConfig`,
			fileExtensions: ['js'],
		});

		assert.deepEqual(config, {});
	});

	it('throws an error if the config file has no default export or does not export config', async () => {
		await assert.rejects(
			async () => {
				await importConfigFile({
					filePath: `${import.meta.dirname}/testConfigDirs/manyExtensions/missingExport`,
					fileExtensions: ['ts'],
					shouldThrowError: true,
				});
			},
			(error) => {
				assert(error instanceof Error);
				assert(
					error.message.includes(
						'has no default export and does not have export "config"',
					),
				);
				return true;
			},
		);

		const config = await importConfigFile({
			filePath: `${import.meta.dirname}/testConfigDirs/manyExtensions/missingExport`,
			fileExtensions: ['ts'],
			shouldThrowError: false,
		});

		assert.deepEqual(config, {});
	});

	it('returns an empty object if the config file is not found and shouldThrowError is false', async () => {
		const config = await importConfigFile({
			filePath: `${import.meta.dirname}/testConfigDirs/manyExtensions/nonExistentFile`,
			fileExtensions: ['json'],
			shouldThrowError: false,
		});

		assert.deepEqual(config, {});
	});
});
