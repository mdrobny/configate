import type { CollectionsTestConfig } from '../../loadConfig.test.ts';

export const config: Partial<CollectionsTestConfig> = {
    events: new Set(['scoreChange']),
    labels: new Map([['c', { text: 'test-c' }]]),
    createdAt: new Date('2025-06-01T00:00:00.000Z'),
};
