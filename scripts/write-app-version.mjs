import { readFileSync, writeFileSync } from 'node:fs';

const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
const version = packageJson.version;

writeFileSync('src/app/app-version.ts', `export const APP_VERSION = '${version}';\n`);
