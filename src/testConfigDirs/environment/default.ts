import type { TestConfig } from '../../importConfigFiles.test.js';

export const config: TestConfig = {
    shallowProperty: 'shallow',
    nestedObject: {
        nestedProperty1: 'nested1',
        nestedProperty2: 'nested2',
    },
};
