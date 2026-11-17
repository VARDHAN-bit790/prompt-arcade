'use strict';
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const suites = ['world', 'action', 'puzzles', 'progress', 'shell'];
let failures = 0;

for (const suite of suites) {
  console.log(`\nRunning ${suite} tests...`);
  const result = spawnSync(process.execPath, [path.join(root, 'tests', `${suite}.test.cjs`)], {
    cwd: root,
    stdio: 'inherit'
  });
  if (result.error || result.status !== 0) {
    failures += 1;
    if (result.error) console.error(result.error.message);
    if (result.signal) console.error(`${suite} tests stopped by ${result.signal}.`);
  }
}

console.log(`\n${suites.length - failures}/${suites.length} test suites passed.`);
process.exitCode = failures ? 1 : 0;
