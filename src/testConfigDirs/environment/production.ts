import type { TestConfig } from '../../importConfigFiles.test.js';

export const config: TestConfig = {
	shallowProperty: 'shallow-production',
	nestedObject: {
		nestedProperty1: 'nested1-production',
		nestedProperty2: 'nested2-production',
	},
};
