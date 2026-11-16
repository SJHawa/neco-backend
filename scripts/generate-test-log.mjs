#!/usr/bin/env node

/**
 * Generate deterministic sample application logs for local testing.
 * This script does not import or start the backend application.
 *
 * Usage:
 *   node scripts/generate-test-log.mjs --count 100
 *   node scripts/generate-test-log.mjs --count 100 --seed 42 --out ./sample.log
 */

import fs from 'node:fs';

const args = process.argv.slice(2);

function option(name, fallback) {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

const count = Math.max(1, Number(option('--count', '50')) || 50);
const seed = Number(option('--seed', '20261104')) || 20261104;
const outputPath = option('--out', null);

const levels = [
  ['INFO', 0.68],
  ['DEBUG', 0.12],
  ['WARN', 0.12],
  ['ERROR', 0.07],
  ['FATAL', 0.01],
];
const messages = {
  INFO: ['request completed', 'room state synchronized', 'user authenticated'],
  DEBUG: ['socket heartbeat sent', 'cache lookup completed', 'query parameters parsed'],
  WARN: ['cache miss for user', 'slow request detected', 'retry scheduled'],
  ERROR: ['database timeout', 'invalid room state', 'upstream service unavailable'],
  FATAL: ['connection pool exhausted'],
};

function random() {
  // Small deterministic generator: same seed produces the same log fixture.
  let value = seed;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 0x100000000;
  };
}

function pick(rng, values) {
  return values[Math.floor(rng() * values.length)];
}

function chooseLevel(rng) {
  const point = rng();
  let cursor = 0;
  for (const [level, weight] of levels) {
    cursor += weight;
    if (point <= cursor) return level;
  }
  return 'INFO';
}

function statusFor(level, rng) {
  if (level === 'FATAL' || level === 'ERROR') return pick(rng, ['500', '502', '504']);
  if (level === 'WARN') return pick(rng, ['200', '404', '429']);
  return pick(rng, ['200', '201', '204']);
}

function buildLogs() {
  const rng = random();
  const start = Date.parse('2026-11-04T00:00:00.000Z');
  const lines = [];

  for (let index = 0; index < count; index += 1) {
    const level = chooseLevel(rng);
    const timestamp = new Date(start + index * 1000).toISOString();
    const status = statusFor(level, rng);
    const message = pick(rng, messages[level]);
    const userId = 1000 + Math.floor(rng() * 9000);
    lines.push(`${timestamp} ${level} requestId=req-${index + 1} status=${status} ${message} user ${userId}`);
  }

  return `${lines.join('\n')}\n`;
}

const result = buildLogs();
if (outputPath) {
  fs.writeFileSync(outputPath, result, 'utf8');
  console.error(`Wrote ${count} log lines to ${outputPath}`);
} else {
  process.stdout.write(result);
}
