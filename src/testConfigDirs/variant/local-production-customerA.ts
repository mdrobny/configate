import type { DeepPartial } from '../../common.ts';
import type { TestConfig } from '../../importConfigFiles.test.js';

export const config: DeepPartial<TestConfig> = {
    nestedObject: {
        nestedProperty1: 'local-production-customerA-n1',
    },
};
