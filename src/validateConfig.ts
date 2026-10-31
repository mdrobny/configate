import type { StandardSchemaV1 } from './standardSchema.ts';

/**
 * Validate config with any Standard Schema compliant validator (zod, valibot, arktype...)
 * Returns the validator's output, so transforms, coercions and defaults are applied
 */
export async function validateConfig<Output>(
    schema: StandardSchemaV1<unknown, Output>,
    config: unknown,
): Promise<Output> {
    const result = await schema['~standard'].validate(config);

    if (result.issues) {
        throw new ConfigValidationError(result.issues);
    }
    return result.value;
}

/**
 * Thrown when the loaded config does not match the provided schema
 */
export class ConfigValidationError extends Error {
    readonly issues: ReadonlyArray<StandardSchemaV1.Issue>;

    constructor(issues: ReadonlyArray<StandardSchemaV1.Issue>) {
        super(
            `Config validation failed:\n${issues
                .map((issue) => {
                    const path = formatPath(issue.path);
                    return `  - ${path ? `${path}: ` : ''}${issue.message}`;
                })
                .join('\n')}`,
        );
        this.name = 'ConfigValidationError';
        this.issues = issues;
    }
}

function formatPath(path: StandardSchemaV1.Issue['path']): string {
    if (!path) {
        return '';
    }
    return path
        .map((segment) =>
            String(
                typeof segment === 'object' && segment !== null
                    ? segment.key
                    : segment,
            ),
        )
        .join('.');
}
