import type { ArrayTestConfig } from '../../loadConfig.test.ts';

export const config: ArrayTestConfig = {
    values: [1, 2],
    nested: [[{ label: 'original' }]],
    empty: [],
};
