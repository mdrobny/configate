import { expect } from 'bun:test';

import { config } from './config.ts';

expect(config.textToDisplay).toEqual('Default text');

console.log(config.textToDisplay);
