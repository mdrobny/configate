# Configate

Configuration helper for TypeScript applications.

It acts as a gateway to your configuration, allowing it to be defined in various ways but used only in a single, type-safe manner.

No dependencies, ESM only.

## Overview

Configate supports:
- defining type-safe configuration files in TypeScript
- loading configuration files in `ts`, `js` and `json` formats
- merging default configuration with environment-specific one based on `NODE_ENV` environment variable (or the provided environment name) 
- merging configs from multiple directories
- merging objects deeply. Arrays are always replaced, not merged. 
- reading environment variables and treating them as part of configuration - should always be used for secrets
- easy and type-safe access to configuration properties - it throws error when accessing undefined properties
- configuration immutability - it freezes the configuration object to prevent modifications
- EcmaScript Modules (ESM) - it works **only** in ESM applications
   - but config files can be in CommonJS format if really necessary

## Installation

To install Configate, use your preferred package manager:

```sh
npm install configate
```

## Usage

### Using Configate in your application

Use the `loadConfig` function once, to load and merge configurations from specified directories. 
With parameters you can define:
- `configDirs`: (Default: `['${current-working-directory}/config']`) An array of directories to load configurations from
- `environment`: (Default: `process.env.NODE_ENV`) The environment to load specific configurations for
- `fileExtensions`: (Default: `['ts', 'js']`) An array of file extensions to load configurations from
- `throwOnUndefinedProp`: (Default: `true`) If true, throws an error when accessing undefined properties
- `freezeConfig`: (Default: `true`) If true, freezes the configuration object to make it immutable

```ts
// src/config.ts
import { loadConfig } from 'configate';

export const { config } = await loadConfig<YourConfigStructure>();

export type YourConfigStructure = {
  database: {
    host: string;
    port: number;
    password: string
  };
};
```

Use this `src/config.ts` anywhere in your application to access the configuration object just like this:
```ts
// src/app.ts
import { config } from './config.ts';

const database = dbClient({
  host: config.database.host,
  port: config.database.port,
  password: config.database.password, 
});
```

### Defining configuration files

1. Create a `config` directory in your project.
2. Create `default.ts` file in `config` directory and export a `config` object with default values.

```ts
// config/default.ts
import type { YourConfigStructure } from '../src/config.ts';

export const config: YourConfigStructure = {
  database: {
    host: 'localhost',
    port: 5432,
    password: ''   
  },
};
```

That's it 🎉 

### Defining environment-specific configuration files

Environments can be named for example `development`, `staging`, `production` but you can use any names you want.

Create for example `production.ts` file in `config` directory and export a `config` object.
- you can use the `DeepPartial` type to allow partial configuration, since usually you just want to override some properties.
- this file will be merged with the default configuration if the `NODE_ENV` environment variable is set to `production`.

```ts
// config/production.ts
import type { DeepPartial } from 'configate';
import type { YourConfigStructure } from '../src/config.ts';

export const config: DeepPartial<YourConfigStructure> = {
    database: {
        host: 'database-production-server.com',
    },
};
```

Do the same for other environments if you need to override more properties for them.

### Using environment variables

When you need to define secrets in configuration, they should be defined via environment variables.

Create `custom-environment-variables.ts` file in `config` directory and export a `config` object.
- use `process.env` to read environment variables and assign to property in your configuration
- this file will be merged with other configs as last one so environment variables always have priority

```ts
// config/custom-environment-variables.ts
import type { DeepPartial } from 'configate';
import type { YourConfigStructure } from '../src/config.ts';

export const config: DeepPartial<YourConfigStructure> = {
    database: {
        password: process.env.DATABASE_PASSWORD,
    },
};
```

### Defining local configuration files

Local configuration files are not committed to the repository and are used for local development only.
Use them to override some configuration when running the application locally.

Supported variants:
- `local.ts` - always loaded
- `local-{environment}.ts` - local, environment-specific config. Example: `local-development.ts` 
   - loaded when `NODE_ENV` is set or `environment` parameter is provided to `loadConfig` function

Add this to `.gitignore` to prevent committing local configuration files:
```txt
**/config/local*
```

### Order of loading configuration files

```
default.ext
{environment}.ext
local.ext
local-{environment}.ext
custom-environment-variables.ext
```

### Using unsecure config

Sometimes you may need to use configuration which doesn't throw on undefined properties, 
for example when you want to pass part of it to some external module and it will try to read unknown properties.
But you shouldn't set `throwOnUndefinedProp: false` to just handle this case.

For this reason, the `unsecureConfig` object is also returned from `loadConfig` function, alongside the `config` object.

```ts
// src/config.ts
import { loadConfig } from 'configate';

export const { config, unsecureConfig } = await loadConfig();

someExternalModule(unsecureConfig.database); // It won't throw error if external module tries to read e.g. `unsecureConfig.database.user` property
```

### Alias for config file

If you want to import `src/config.ts` with absolute path, define:
```json5
// package.json
{
  "imports": {
    "#config": "./src/config.ts"
  }
}
```
and
```json5
// tsconfig.json
{
  "compilerOptions": {
    "paths": { "#config": ["./src/config.ts"] }
  }
}
```
and then import it like this:
```ts
import { config } from '#config';

const host = config.database.host;
```    

### Examples

#### Loading configurations from multiple directories

```ts
import { loadConfig } from 'configate';

export const { config } = await loadConfig<TestConfig>({
  configDirs: [
    `${import.meta.dirname}/../../someParentConfigDirectory`,
    `${import.meta.dirname}/../config`,
  ],
});
```

