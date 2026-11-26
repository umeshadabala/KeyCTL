// One JSON request per process. Team code owns all application behavior.
'use strict';
const fs = require('node:fs');
const { dispatch } = require('./team_app.cjs');

async function main() {
  try {
    const request = JSON.parse(fs.readFileSync(0, 'utf8'));
    if (!request || typeof request !== 'object' || Array.isArray(request)) {
      throw new Error('Request must be an object');
    }
    const response = await dispatch(request);
    if (!response || typeof response !== 'object' || Array.isArray(response)) {
      throw new Error('Response must be an object');
    }
    process.stdout.write(JSON.stringify(response) + '\n');
  } catch {
    process.stderr.write('Request failed; inspect team application locally.\n');
    process.exitCode = 1;
  }
}
main();
