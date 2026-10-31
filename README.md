# Configate

[![NPM Version](https://img.shields.io/npm/v/configate)](https://www.npmjs.com/package/configate)
[![JSR](https://jsr.io/badges/@drob/configate)](https://jsr.io/@drob/configate)

Load defaults, environment overrides, and environment variables into one typed configuration object for your TypeScript application.

Configate merges configuration files, gives you typed property access, and freezes the result by default. 
Accessing a missing property throws an error to help catch configuration mistakes.
Optionally, pass a [Standard Schema](https://standardschema.dev) (zod, valibot, ...) to [validate the configuration at runtime](#validate-configuration-at-runtime) and infer its type.

Zero dependencies. ESM only. Supports Node.js, Bun, and Deno.

[Quick start](#quick-start) · [Common usages](#common-usages) · [Merging](#how-merging-works) · [API reference](#api-reference) · [Advanced recipes](#advanced-recipes) · [Troubleshooting](#troubleshooting) · [Examples and help](#examples-and-help)

## Quick start

This example uses Node.js 22.18+ with native TypeScript support. See [runtime requirements](#runtime-requirements) for other setups.

### 1. Install

From your application's root directory:

```sh
npm add configate
```

### 2. Create the configuration files

Create this structure in your project:

```text
config/
  default.ts
src/
  config.ts
  app.ts
package.json
```

Define the shape of your configuration and load it once:

```ts
// src/config.ts
import { type DeepPartial, loadConfig } from 'configate';

export type AppConfig = {
  appName: string;
  server: {
    port: number;
  };
};

export type PartialAppConfig = DeepPartial<AppConfig>;

export const { config } = await loadConfig<AppConfig>();
```

Provide the default values:

```ts
// config/default.ts
import type { AppConfig } from '../src/config.ts';

export const config: AppConfig = {
  appName: 'My app',
  server: {
    port: 3000,
  },
};
```

### 3. Use the configuration

Import the same configuration object wherever your application needs it:

```ts
// src/app.ts
import { config } from './config.ts';

console.log(`${config.appName}: port ${config.server.port}`);
```

Run from the project root:

```sh
node src/app.ts
```

With `NODE_ENV` unset, the output is:

```text
My app: port 3000
```

## Common usages

### Override configuration by environment

Add a file named after your environment, such as `production.ts`. Import `PartialAppConfig` from `src/config.ts` to specify only the values you want to override:

```ts
// config/production.ts
import type { PartialAppConfig } from '../src/config.ts';

export const config: PartialAppConfig = {
  server: {
    port: 8080,
  },
};
```

Select the environment using `NODE_ENV` (macOS/Linux shell syntax):

```sh
NODE_ENV=production node src/app.ts
```

The port changes and the application name keeps its default:

```text
My app: port 8080
```

You can also select it in code by changing the `loadConfig` call in `src/config.ts`:

```ts
export const { config } = await loadConfig<AppConfig>({
  environment: 'production',
});
```

The explicit `environment` option takes precedence over `NODE_ENV`. Any environment name is allowed, including `development`, `staging`, and `test`.

### Read environment variables

Create `custom-environment-variables.ts` to map environment variables to configuration properties:

```ts
// config/custom-environment-variables.ts
import type { PartialAppConfig } from '../src/config.ts';

export const config: PartialAppConfig = {
  server: {
    port: process.env.PORT === undefined ? undefined : Number(process.env.PORT),
  },
};
```

Environment variables are strings. Convert numbers and booleans explicitly; Configate does not parse them. For example, `Number('invalid')` produces `NaN`, so add a [`schema`](#validate-configuration-at-runtime) to reject invalid values at startup.

With the production file above, run (macOS/Linux):

```sh
NODE_ENV=production PORT=9000 node src/app.ts
```

Output:

```text
My app: port 9000
```

If `PORT` is unset, the `undefined` override is ignored and the previously loaded port is preserved. This file is merged last **within its directory**; later configuration directories can still override its values.

Keep secrets out of committed configuration files. 
Read them from your environment and check required values in application startup code.
A missing environment variable does not automatically cause `loadConfig` to fail, and an empty-string default remains an empty string.

Configate does not load `.env` files itself. If you use one, load it through your runtime or another tool before calling `loadConfig`.

### Validate configuration at runtime

Pass any [Standard Schema](https://standardschema.dev) compatible schema (zod 3.24+, valibot 1.0+, ArkType, and others) as `schema`. 
Schemas are optional, and Configate adds no dependency; install the validation library you prefer.

```ts
// src/config.ts
import { type DeepPartial, loadConfig } from 'configate';
import { z } from 'zod';

const schema = z.object({
  appName: z.string(),
  server: z.object({
    port: z.number().int().positive(),
  }),
});

export type AppConfig = z.infer<typeof schema>;
export type PartialAppConfig = DeepPartial<AppConfig>;

export const { config } = await loadConfig({ schema });
```

The config type is inferred from the schema, so no generic is needed. 
The merged configuration is validated once, after all files are loaded. 
If it is invalid, `loadConfig` rejects with a `ConfigValidationError` that lists every issue and exposes them as `error.issues`:

```text
Config validation failed:
  - server.port: Invalid input: expected number, received NaN
```

Both `config` and `unsecureConfig` contain the schema's **output**, so defaults, coercions, and transforms (for example `z.coerce.number()` for environment variables) are applied. 
Use schemas that output only plain data (objects, arrays, strings, numbers, booleans). Class instances such as `Date` are wrapped by the missing-property proxy and frozen, which breaks their methods.

### Override configuration locally

Use local files for settings you do not want to commit:

| File | When it loads |
| --- | --- |
| `local.ts` | Whenever present, in any environment (rather avoid using it) |
| `local-{environment}.ts` | When the selected environment matches, such as `local-development.ts` (recommended) |

Both accept partial configuration, just like `production.ts`. 
Local files are not automatically restricted to development: a deployed `local.ts` also loads in production.

Add this pattern to your `.gitignore`:

```gitignore
**/config/local*
```

## How merging works

### File loading order

Within each configuration directory, files load in the following order. **Later values override earlier values.**

```text
1. default.ext
2. default-{variant}.ext
3. {environment}.ext
4. {environment}-{variant}.ext
5. local.ext
6. local-{variant}.ext
7. local-{environment}.ext
8. local-{environment}-{variant}.ext
9. custom-environment-variables.ext
```

Here, `ext` is an enabled [file extension](#supported-file-formats). Environment and variant files are considered only when their corresponding options are set. JSON is not supported for `custom-environment-variables`.

Each directory must contain a default file. Other files are optional, although Configate logs a warning if a selected environment's file cannot be loaded.

### Merge rules

- Objects merge recursively, preserving properties that are not overridden.
- Arrays are replaced entirely, not combined.
- Properties whose override value is `undefined` are ignored.
- Directories are fully loaded and then merged in `configDirs` order. Later directories win.

For example, the second directory's `default.ts` can override a value from the first directory's `custom-environment-variables.ts`. See [multiple directories](#load-configuration-from-multiple-directories) for an example setup.

## API reference

### loadConfig

`await loadConfig<AppConfig>(options?)` loads and merges the configuration, returning `{ config, unsecureConfig }`.

All options are optional:

| Option | Type | Default | Purpose |
| --- | --- | --- | --- |
| `configDirs` | `string[]` | `[process.cwd() + '/config']` | Directories to load, in merge order. Each needs a default file. |
| `environment` | `string` | `process.env.NODE_ENV` | Select environment overrides. |
| `variant` | `string` | `undefined` | Select another override dimension, such as a customer or region. |
| `fileExtensions` | `FileExtension[]` | `['ts', 'js']` | Extensions to search, in priority order; omit the leading dot. |
| `throwOnUndefinedProp` | `boolean` | `true` | Throw when reading a property that does not exist. |
| `freezeConfig` | `boolean` | `true` | Deeply freeze `config`, including arrays. |
| `schema` | Standard Schema | `undefined` | Validate the merged config at runtime and infer its type. See [validation](#validate-configuration-at-runtime). |

The default directory is relative to the **working directory of the process**, not the file that calls `loadConfig`. Use absolute paths when the launch directory can vary.

### Return values and types

| Return value | Behavior |
| --- | --- |
| `config` | Typed as `AppConfig`; frozen and checked for missing-property access by default. The two options above control those protections. |
| `unsecureConfig` | An independent, mutable copy typed as `AppConfig`, without missing-property checks. Changing it does not change `config`. |

`AppConfig` is your own application type. The quick start also exports `PartialAppConfig = DeepPartial<AppConfig>` from `src/config.ts` for use in override files. Configate provides the `DeepPartial<T>` helper, the `FileExtension` type for extension options, and the `ConfigValidationError` class.

TypeScript checks typed configuration files and property access at compile time. The `AppConfig` generic does **not** validate loaded values at runtime; pass a [`schema`](#validate-configuration-at-runtime) for that. Missing-property checks happen when a property is read; they do not check all required fields at startup or reject existing values such as `undefined`, `''`, or `NaN`.

### Supported file formats

Supported extensions are `ts`, `mts`, `js`, `mjs`, `cjs`, and `json`. Only `ts` and `js` are enabled by default.

TypeScript and JavaScript files can use `export const config = { ... }` or `export default { ... }`. If both exist, the named `config` export takes precedence. CommonJS config files can use `module.exports = { ... }` when `cjs` is enabled; your application still uses the ESM API.

For each filename, Configate selects the **first available extension** in `fileExtensions`. With `['ts', 'js']`, `default.ts` wins over `default.js`; they are not merged together.

To use JSON defaults, create `config/default.json` with a plain configuration object:

```json
{
  "appName": "My app",
  "server": {
    "port": 3000
  }
}
```

Then change the call in `src/config.ts`:

```ts
export const { config } = await loadConfig<AppConfig>({
  fileExtensions: ['json', 'ts', 'js'],
});
```

This prefers JSON while still allowing TypeScript or JavaScript environment-variable files.

### Runtime requirements

| Runtime | Setup |
| --- | --- |
| Node.js | The package declares Node.js 20+. The TypeScript quick start targets Node.js 22.18+ with native type stripping; Node.js 20 needs a TypeScript loader or compiled JavaScript files. |
| Bun | Install with `bun add configate` and run the quick start with `bun src/app.ts`. |
| Deno | Install with `deno add jsr:@drob/configate`, change package imports to `@drob/configate`, and run with `deno run --allow-read --allow-env --allow-sys src/app.ts`. |

Configate uses your runtime to import files; it does not transpile TypeScript. With [Node.js native TypeScript support](https://nodejs.org/api/typescript.html), use erasable syntax and `import type` for types. Native execution does not type-check your code or read `tsconfig.json`; run TypeScript separately for type checking.

## Advanced recipes

### Add customer or region variants

Use `variant` for a second dimension of overrides alongside the environment:

```text
config/
  default.ts
  default-customerA.ts
  default-customerB.ts
  production.ts
  production-customerA.ts
```

Change the call in `src/config.ts`:

```ts
export const { config } = await loadConfig<AppConfig>({
  environment: 'production',
  variant: 'customerA',
});
```

This loads the customer A defaults and production overrides in the [documented order](#file-loading-order). Variant files can import `PartialAppConfig` from `src/config.ts`, just like environment overrides.

The optional filenames are `default-{variant}.ext`, `{environment}-{variant}.ext`, `local-{variant}.ext`, and `local-{environment}-{variant}.ext`. Files for other variants are ignored.

### Load configuration from multiple directories

For shared defaults and application-specific overrides, change the call in `src/config.ts`:

```ts
export const { config } = await loadConfig<AppConfig>({
  configDirs: [
    `${import.meta.dirname}/../shared-config`,
    `${import.meta.dirname}/../config`,
  ],
});
```

Create both directories at the project root, each with its own default file. The `config` directory overrides `shared-config` after all files in `shared-config` have loaded. These absolute paths remain consistent when you launch the application from another directory.

### Pass configuration to third-party libraries

Some libraries read optional properties or modify the options object they receive. Export `unsecureConfig` from `src/config.ts` for those integrations:

```ts
export const { config, unsecureConfig } = await loadConfig<AppConfig>();
```

Pass `unsecureConfig.server` as the library's server-options object. It allows reads of missing properties and mutations, while the main `config` keeps its default protections.

### Add an import alias

For the Node.js source layout in the quick start, add a package import to `package.json` (keep your other fields):

```json
{
  "type": "module",
  "imports": {
    "#config": "./src/config.ts"
  }
}
```

You can then use this import anywhere in the package:

```ts
import { config } from '#config';

console.log(config.server.port);
```

TypeScript's `NodeNext` module resolution understands package imports. A `tsconfig.json` `paths` entry alone does not create a runtime alias. If you compile your application to JavaScript, point the runtime alias at the emitted file instead.

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| `Config file ".../default" not found` | Run from the project root, or set absolute `configDirs`. Every directory needs a default file with an enabled extension. |
| `Environment ... defined but no config file found` | Check `NODE_ENV`, the `environment` option, and the matching file. This warning also occurs if that file fails to import. |
| An override has no effect | Check the filename, selected environment/variant, extension priority, and later overrides. Optional override files that fail to import are skipped, so also check their syntax, imports, and exports. |
| `Config validation failed` | The merged config does not match your `schema`. Each listed issue shows the path and reason; check every file that sets that property. |
| `Property ... is not defined in the config` | The property is absent when read. Add it to the configuration, or use `unsecureConfig` for integrations that read optional properties. |
| TypeScript files fail to load | Check your runtime's TypeScript support and ESM setup. Configate does not provide a loader. |
| An environment variable has no effect | Map it in `custom-environment-variables.ts` and set it before loading. Unset values preserve earlier defaults; `.env` files need an external loader. |
| A config assignment throws | `config` is frozen by default. Use the mutable `unsecureConfig` copy for integrations, or set `freezeConfig: false` if the application needs mutable configuration. |

## Examples and help

For questions or bug reports, [open an issue](https://github.com/mdrobny/configate/issues).
Include your runtime version, file layout, and `loadConfig` options, with secrets removed.

The repository includes [Bun](examples/bun) and [Deno](examples/deno) examples. 
They import the library's source directly and are intended to run from a repository checkout; installed applications should use the package imports documented above.

