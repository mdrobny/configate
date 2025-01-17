import { assertEquals } from '@std/assert';

import { config } from './config.ts';

assertEquals(config.textToDisplay, 'Default text');

console.log(config.textToDisplay);
