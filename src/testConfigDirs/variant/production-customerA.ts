import type { DeepPartial } from '../../common.ts';
import type { TestConfig } from '../../importConfigFiles.test.js';

export const config: DeepPartial<TestConfig> = {
    shallowProperty: 'production-customerA',
};
