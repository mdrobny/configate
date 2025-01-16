import type { DeepPartial } from '../../common.ts';
import type { TestConfig } from '../../loadConfig.test.ts';

export const config: DeepPartial<TestConfig> = {
	shallowProperty: process.env.SHALLOW_PROPERTY,
};
