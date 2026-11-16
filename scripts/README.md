# Standalone scripts

These scripts are intentionally independent from the NestJS application. They can be used during local development or incident investigation without changing server runtime behavior.

## Log summary

Summarize log levels, HTTP status codes, and repeated warning/error messages:

```bash
node scripts/log-summary.mjs ./application.log
node scripts/log-summary.mjs ./application.log --top 10
node scripts/log-summary.mjs ./application.log --json
```

The utility also accepts standard input, so it can be used in a pipeline:

```bash
cat application.log | node scripts/log-summary.mjs
```

## Generate a test log

Create a deterministic log fixture and pipe it directly into the summary tool:

```bash
node scripts/generate-test-log.mjs --count 100 --seed 42 \
  | node scripts/log-summary.mjs --json
```

To save the generated fixture instead:

```bash
node scripts/generate-test-log.mjs --count 100 --out ./sample.log
```

## Validate deployment environment

Check required secrets and deployment values before starting Compose:

```bash
node scripts/validate-env.mjs .env
node scripts/validate-env.mjs .env --strict
```

The command never prints secret values. It only reports missing keys or obvious placeholder values.
