import type { DeepPartial } from '../../common.ts';
import type { TestConfig } from '../../importConfigFiles.test.js';

export const config: DeepPartial<TestConfig> = {
    shallowProperty: 'production',
    nestedObject: {
        nestedProperty2: 'production-n2',
    },
};
