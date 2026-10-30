---
name: migrate-config-to-configate
description: Migrate applications from the config npm package (node-config) to configate, preserving configuration values, override precedence, environment variables, and application startup behavior. Use when replacing config imports, configuration files, or node-config deployment settings with Configate.
---

# Migrate node-config to Configate

Implement the migration in the consuming application. 
Preserve its effective configuration, value types, and deployment behavior; identify any intentional differences. 
Configate is an ESM configuration loader with an asynchronous initialization step and typed property access.

## Inspect the application first

Find the installed versions, package manager, module format, runtime, build output, and test runner. Inventory:

- Imports and `require()` calls for `config`, its subpaths, application wrappers, and test mocks.
- `get()`, `has()`, direct property access, dynamic paths, utility calls, and configuration mutations.
- Configuration directories, formats, environment and local files, hostname and instance overrides, and custom environment mappings.
- Configuration-related variables and arguments in startup scripts, containers, CI, and deployment manifests: `NODE_ENV`, `NODE_CONFIG_ENV`, `NODE_CONFIG_DIR`, `NODE_APP_INSTANCE`, `NODE_CONFIG`, `HOST`, `HOSTNAME`, and node-config flags.

Record representative effective values before editing, including their types and which overrides win.
Use synthetic secrets in fixtures and redact sensitive values from reports.

Check behavior against the target Configate version's source or tests. 
This skill reflects the current repository implementation; published versions may differ. 
Check the implementation notes below when those features matter.

## Establish one initialization boundary

Add `configate` using the application's package manager and keep the lockfile updated. 
Create one application module that awaits `loadConfig<Config>()` and exports the result. 
Redirect consumers to this module; they should not initialize Configate independently.

```ts
// src/config.ts
import { loadConfig, type DeepPartial } from 'configate';

export const { config, unsecureConfig } = await loadConfig<Config>({
  environment: process.env.NODE_ENV,
  fileExtensions: ['ts'],
});

export type Config = {
    database: {
        host: string;
        port: number;
        password: string;
    };
    telemetry?: { endpoint: string };
};

export type PartialConfig = DeepPartial<Config>;
```

The environment expression preserves node-config's single-environment selection and development fallback. 
Configate itself defaults only to `process.env.NODE_ENV`; an unset value loads no environment-specific file. 
Multiple comma-separated environments need an explicit migration design.

Adapt extensions to the files actually retained.
Configate defaults to `['ts', 'js']`; JSON is opt-in. It also supports `mts`, `mjs`, and `cjs`. For each basename, only the first existing extension in the configured list is selected; other matching files are not merged.

Configate uses native dynamic imports; it does not transpile TypeScript. 
Verify that the production runtime can execute the selected files, or compile configuration modules and load their emitted extensions. 
Match import suffixes to the application's build conventions; the examples above use source `.ts` imports. 
Copy retained JSON files into the deployment artifact.

For an application using CommonJS, establish an ESM startup boundary with awaited initialization or plan the necessary module conversion. 
A synchronous `require('configate')` replacement cannot provide the loaded config. 
Preserve the application's module conventions where possible; account for the test runner and build before changing package-wide module settings.

Ensure environment setup finishes before initialization. 
If bootstrap code changes `process.env`, statically importing an application module that loads configuration runs too early; 
await a dynamic application import after that setup, or pass initialized configuration into the application.

## Convert configuration files

Prefer an explicit `Config` type for defaults and `DeepPartial<Config>` for overrides. 
Keep type-only imports separate from the runtime loader to avoid initialization cycles.

```ts
// config/default.ts
import type { Config } from '../src/config.ts';

export const config: Config = {
  database: { host: 'localhost', port: 5432, password: '' },
};
```

```ts
// config/production.ts
import type { PartialConfig } from '../src/config.ts';

export const config: PartialConfig = {
  database: { host: 'database.internal' },
};
```

Named `config` exports are preferred and take precedence over default exports. 
Default object exports are also accepted. 
Retained CommonJS configuration files can use `module.exports` in `.cjs` files with `cjs` enabled; do not leave CommonJS syntax in `.js` files whose package scope has become ESM.

Convert unsupported formats such as YAML or JSON5 to supported modules or strict JSON. 
JSON comments accepted by node-config must be removed or moved to code files. 
Preserve evaluated values rather than merely renaming extensions. 
See [node-config file formats](https://github.com/node-config/node-config/wiki/Configuration-Files#file-formats).

Keep configuration as cloneable data. 
Configate calls `structuredClone()` on loaded values: exported functions, deferred/raw wrappers, and class instances are not equivalent migrations. 
Compute ordinary data before export and construct clients or services outside configuration. 
The `Config` generic supplies TypeScript typing, not runtime schema validation.

## Preserve loading and merging behavior

Configate's default directory is `process.cwd() + '/config'`. It does not interpret `NODE_CONFIG_DIR`. 
When that setting is used, split it with `delimiter` from `node:path`, resolve each entry to an absolute filesystem path, and pass the array as `configDirs`. 
Otherwise choose paths appropriate to both source and deployed layouts. 
Do not pass URL objects as directory strings.

Each configured directory must contain a loadable `default` file. 
In this implementation, a directory is fully loaded before the next directory is merged. 
Later directories override earlier ones, including overriding their environment-variable values. 
Preserve cross-directory precedence with representative checks; custom environment overrides are last within each directory, not globally last across all directories.

Within each directory, the implemented order is:

```text
default
default-{variant}
{environment}
{environment}-{variant}
local
local-{variant}
local-{environment}
local-{environment}-{variant}
custom-environment-variables
```

Environment and variant entries are conditional on the corresponding option. 
Objects merge recursively, arrays replace whole arrays, and `undefined` values do not overwrite existing values. 
`null`, `false`, `0`, and empty strings do overwrite them.

Implementation notes:

- A missing or invalid default file rejects loading. 
- Environment-file errors are caught and reported as a warning
- errors in other optional files, including custom environment modules, can be silently ignored. 
- Successful initialization alone does not prove the overrides loaded.

Handle legacy features only where the application uses them:

| Existing behavior | Migration action |
| --- | --- |
| `NODE_APP_INSTANCE` overrides | Pass it explicitly as `variant` if its filename and precedence semantics fit; verify combined local environment/variant support in the installed version. |
| Hostname-specific files | Move the required overrides into an explicit supported layout or application loading step; Configate does not discover hostnames. |
| Multiple environments, `NODE_CONFIG`, CLI overrides | Preserve their actual ordering in an application-specific loading strategy; Configate has no direct option for these features. |
| Strict-mode and warning flags | Add equivalent startup checks where required; node-config flags do not configure Configate. |
| Runtime mutation flags | Prefer explicit test fixtures or dependency injection; do not disable Configate protections globally to accommodate one consumer. |

Do not import Configate's internal merge or loader functions as a replacement public API. 
Its public exports are `loadConfig`, `DeepPartial`, and `FileExtension`.

## Rewrite custom environment mappings

Node-config's custom mappings name environment variables and can request parsing through `__name` / `__format`. 
Empty environment values are ignored. Preserve these semantics explicitly; bare mappings produce strings even when the default value is numeric. 
See [node-config custom environment variables](https://github.com/node-config/node-config/wiki/Environment-Variables#custom-environment-variables).

Configate expects a code module that exports the actual values. 
It deliberately excludes JSON when loading `custom-environment-variables`, even if JSON is enabled for other files. 
Renaming a JSON mapping to TypeScript without replacing the variable-name strings is incorrect.

For example, migrate this mapping:

```json
{
  "database": {
    "password": "DATABASE_PASSWORD",
    "port": { "__name": "DATABASE_PORT", "__format": "number" }
  }
}
```

to:

```ts
// config/custom-environment-variables.ts
import type { DeepPartial } from 'configate';
import type { Config } from '../src/config.ts';

const port = process.env.DATABASE_PORT;

export const config: DeepPartial<Config> = {
  database: {
    password: process.env.DATABASE_PASSWORD || undefined,
    port: port === undefined || port === '' ? undefined : Number(port),
  },
};
```

Handle boolean and structured values with explicit parsing matching the application's existing behavior. 
`Boolean('false')` is `true`, and `Number('')` is `0`; neither is a safe generic replacement. 
Keep parsing conditional so absent values preserve lower-priority configuration. 
Load any existing `.env` mechanism before Configate; 
Configate does not load `.env` files itself.

Validate required secrets, parsed values, and application constraints at startup after awaiting `loadConfig`, before creating services.
Do not rely solely on throwing inside an optional configuration module: those errors can be swallowed. 
For JSON or other parsers that may throw, validate the raw input in the application initialization boundary before loading, or otherwise propagate parsing failures there.
Never report the secret value in an error.

## Update consumers and tests

| node-config usage | Configate migration |
| --- | --- |
| `import config from 'config'` | Import `{ config }` from the application's initialization module. |
| `config.get<string>('database.host')` | `config.database.host`; the application config type supplies the type. |
| `config.has('telemetry.endpoint')` | Check the corresponding plain data in `unsecureConfig` while preserving whether the old branch tested existence or a defined value. |
| Optional fallback | `unsecureConfig.telemetry?.endpoint ?? fallback`, when nullish fallback matches the old behavior. |
| Dynamic dotted paths | Prefer typed keys for known paths; retain a small application helper for truly dynamic paths, with tested traversal and missing-value semantics. `config[path]` does not traverse dots. |
| `config.util.toObject()` or passing config to a library | Pass `unsecureConfig` (or a subtree) to any external package by default. Its property access can't be audited, and the proxied `config` throws on any missing-property read. Clone the subtree when the consumer needs a private mutable copy. |
| Other `config.util.*` or `config/*` helpers | Inspect each use and replace its actual behavior; there is no Configate utility namespace. |

By default, `config` is proxied and throws when a property is absent. 
Optional chaining and nullish coalescing on that proxy do not prevent a missing-property exception. 
`throwOnUndefinedProp` checks property presence, not schema validity or secret completeness.

`unsecureConfig` is a separate, unproxied, unfrozen clone of the merged data. 
Mutations do not update `config`, but can affect other consumers of that shared clone. 
Pass `unsecureConfig` subtrees to external packages and other code you don't control. 
You can't know whether they read optional or unknown properties, and the proxy throws on those reads. 
Use it also where the application itself probes for missing properties or needs mutation. 
Keep normal application reads on `config`. 
Clone from `unsecureConfig`, not the proxy, when using `structuredClone()`.

Update mocks to target the application module. 
Use isolated configuration fixtures or fresh processes for environment scenarios, setting variables before loading. 
Avoid tests that depend on mutating the shared frozen configuration or clearing only CommonJS's `require.cache` to reload ESM modules.

## Verify and finish

Run the application's relevant type checks, tests, build, and a startup smoke check using the production runtime and emitted files. 
Focus verification on the behaviors the inventory found:

- Effective values and types for the default environment and deployed environments, including unset `NODE_ENV` if relevant.
- Environment variables absent, empty, valid, and malformed; required secrets missing; explicit `false` and `0` preserved.
- Local, variant, and multiple-directory collisions, plus array replacement where used.
- Missing required properties, optional fallbacks, and libraries that probe unknown properties.
- Startup fails for required invalid settings, and intended override files are actually applied.

Compare against the recorded baseline using redacted or synthetic data. 
Explain any unresolved compatibility gap rather than claiming equivalence from type checking alone.

Remove the application's direct `config` and `@types/config` dependencies after their consumers are migrated. 
Remove obsolete mappings, mocks, flags, and parser dependencies only when no remaining application use needs them. 
Update the lockfile through the package manager; a transitive dependency on `config` may legitimately remain.

Report the migrated entry point, compatibility decisions, checks run, and any remaining deployment work.
For target-version details, consult the [Configate README and source](https://github.com/mdrobny/configate) and the consuming application's installed package.
