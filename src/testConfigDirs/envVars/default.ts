import type { TestConfig } from '../../loadConfig.test.ts';

export const config: TestConfig = {
	shallowProperty: 'shallow',
	nestedObject: {
		nestedProperty1: 'nested1',
		nestedProperty2: 'nested2',
	},
};
