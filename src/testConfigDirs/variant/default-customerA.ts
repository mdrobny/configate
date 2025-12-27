import type { DeepPartial } from '../../common.ts';
import type { TestConfig } from '../../importConfigFiles.test.js';

export const config: DeepPartial<TestConfig> = {
    nestedObject: {
        nestedProperty1: 'default-customerA-n1',
    },
};
