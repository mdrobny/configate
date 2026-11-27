import type { CollectionsTestConfig } from '../../loadConfig.test.ts';

export const config: CollectionsTestConfig = {
    events: new Set(['scoreChange', 'card', 'corner']),
    labels: new Map([
        ['a', { text: 'default-a' }],
        ['b', { text: 'default-b' }],
    ]),
    createdAt: new Date('2020-01-01T00:00:00.000Z'),
};
