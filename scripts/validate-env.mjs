#!/usr/bin/env node

/**
 * Validate deployment environment variables without starting the application.
 *
 * Usage:
 *   node scripts/validate-env.mjs .env
 *   node scripts/validate-env.mjs .env.prod --strict
 */

import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const strict = args.includes('--strict');
const inputPath = args.find((value) => !value.startsWith('--')) ?? '.env';

const requiredKeys = [
  'DB_USERNAME',
  'DB_PASSWORD',
  'DB_NAME',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'LLM_API_KEY',
];

const recommendedKeys = [
  'DOMAIN',
  'REDIS_PASSWORD',
  'LLM_MODEL',
  'RUNTIME_EXECUTION_TIMEOUT_MS',
];

const placeholderValues = new Set([
  '',
  'change_me',
  'change_me_strong_password',
  'change_me_redis_password',
  'your-api-key',
  'replace-me',
]);

function parseEnv(content) {
  const values = new Map();

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const separator = line.indexOf('=');
    if (separator <= 0) continue;

    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, '');
    values.set(key, value);
  }

  return values;
}

function inspect(values) {
  const missing = requiredKeys.filter((key) => !values.has(key));
  const placeholders = requiredKeys.filter((key) => placeholderValues.has(values.get(key)));
  const missingRecommended = recommendedKeys.filter((key) => !values.has(key));

  return { missing, placeholders, missingRecommended };
}

function printList(label, entries) {
  if (entries.length === 0) return;
  console.error(`${label}:`);
  for (const entry of entries) console.error(`  - ${entry}`);
}

if (args.includes('--help')) {
  console.log('Usage: node scripts/validate-env.mjs [env-file] [--strict]');
  process.exit(0);
}

const resolvedPath = path.resolve(inputPath);
if (!fs.existsSync(resolvedPath)) {
  console.error(`Environment file not found: ${resolvedPath}`);
  process.exit(2);
}

const result = inspect(parseEnv(fs.readFileSync(resolvedPath, 'utf8')));
printList('Missing required variables', result.missing);
printList('Placeholder values', result.placeholders);
if (!strict) printList('Recommended variables not set', result.missingRecommended);

const hasErrors = result.missing.length > 0 || result.placeholders.length > 0;
if (hasErrors || (strict && result.missingRecommended.length > 0)) {
  console.error(`Environment validation failed: ${inputPath}`);
  process.exit(1);
}

console.log(`Environment validation passed: ${inputPath}`);
