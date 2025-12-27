import type { TestConfig } from '../../importConfigFiles.test.js';

export const config: TestConfig = {
    shallowProperty: 'default',
    nestedObject: {
        nestedProperty1: 'default-n1',
        nestedProperty2: 'default-n2',
    },
};
