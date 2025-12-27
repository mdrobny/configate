import type { DeepPartial } from '../../common.ts';
import type { TestConfig } from '../../importConfigFiles.test.js';

export const config: DeepPartial<TestConfig> = {
    nestedObject: {
        nestedProperty2: 'local-customerA-n2',
    },
};
