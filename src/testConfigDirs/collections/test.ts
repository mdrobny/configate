import type { CollectionsTestConfig } from '../../loadConfig.test.ts';

export const config: Partial<CollectionsTestConfig> = {
    events: new Set(['scoreChange']),
    labels: new Map([['c', { text: 'test-c' }]]),
};
