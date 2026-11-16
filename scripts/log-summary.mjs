#!/usr/bin/env node

/**
 * Standalone log summary utility.
 *
 * Usage:
 *   node scripts/log-summary.mjs ./app.log
 *   node scripts/log-summary.mjs ./app.log --json
 *   type app.log | node scripts/log-summary.mjs --top 10
 */

import fs from 'node:fs';
import readline from 'node:readline';

const args = process.argv.slice(2);
const jsonOutput = args.includes('--json');
const topIndex = args.indexOf('--top');
const requestedTop = topIndex >= 0 ? Number(args[topIndex + 1]) : 5;
const top = Number.isInteger(requestedTop) && requestedTop > 0 ? requestedTop : 5;
const inputPath = args.find((value, index) => {
  if (value.startsWith('--')) return false;
  return !(topIndex >= 0 && index === topIndex + 1);
});

const levelPattern = /\b(TRACE|DEBUG|INFO|NOTICE|WARN|WARNING|ERROR|FATAL)\b/i;
const statusPattern = /\bstatus(?:Code)?[=: ]+(\d{3})\b|\bHTTP\/\d(?:\.\d)?"?\s+(\d{3})\b/i;
const messagePattern = /(?:ERROR|FATAL|WARN(?:ING)?)\b\s*[:|-]?\s*(.+)$/i;

function createSummary() {
  return {
    lines: 0,
    levels: {},
    statusCodes: {},
    topMessages: [],
  };
}

function normalizeMessage(line) {
  const match = line.match(messagePattern);
  if (!match) return null;

  return match[1]
    .replace(/\b(?:[0-9a-f]{8,}|[0-9]+)\b/gi, '<id>')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 160);
}

function summarize(lines) {
  const summary = createSummary();
  const messages = new Map();

  for (const line of lines) {
    if (!line.trim()) continue;
    summary.lines += 1;

    const level = line.match(levelPattern)?.[1]?.toUpperCase() ?? 'UNKNOWN';
    summary.levels[level] = (summary.levels[level] ?? 0) + 1;

    const statusMatch = line.match(statusPattern);
    const statusCode = statusMatch?.[1] ?? statusMatch?.[2];
    if (statusCode) {
      summary.statusCodes[statusCode] = (summary.statusCodes[statusCode] ?? 0) + 1;
    }

    const message = normalizeMessage(line);
    if (message) messages.set(message, (messages.get(message) ?? 0) + 1);
  }

  summary.topMessages = [...messages.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, top)
    .map(([message, count]) => ({ message, count }));

  return summary;
}

async function readInput() {
  if (inputPath) return fs.readFileSync(inputPath, 'utf8').split(/\r?\n/);

  const lines = [];
  const input = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
  for await (const line of input) lines.push(line);
  return lines;
}

const summary = summarize(await readInput());

if (jsonOutput) {
  console.log(JSON.stringify(summary, null, 2));
} else {
  console.log(`Lines: ${summary.lines}`);
  console.log('\nLevels:');
  for (const [level, count] of Object.entries(summary.levels).sort()) {
    console.log(`  ${level.padEnd(8)} ${count}`);
  }

  console.log('\nStatus codes:');
  const statuses = Object.entries(summary.statusCodes).sort(([a], [b]) => a.localeCompare(b));
  console.log(statuses.length ? statuses.map(([code, count]) => `  ${code} ${count}`).join('\n') : '  none');

  console.log(`\nTop warning/error messages (${top}):`);
  console.log(summary.topMessages.length
    ? summary.topMessages.map(({ message, count }) => `  ${count}x ${message}`).join('\n')
    : '  none');
}
