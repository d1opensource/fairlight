/* eslint-disable @typescript-eslint/no-var-requires */

/**
 * The built `dist` folder is deployed as the NPM package. This script
 * will prepare this folder to be ready for publishing.
 *
 * Steps include:
 * - Copy the current root `package.json` into `dist` after adjusting it for publishing.
 * - Copy relevant files from the root into `dist` (e.g. `README.md`, etc)
 */

const fs = require('fs')

const distRoot = `${__dirname}/../dist`
const packageJson = require('../package.json')

// make package public (root package.json was private to prevent accidentally publishing)
packageJson.private = false

// delete properties that don't need to be published
delete packageJson.scripts

// the root package.json points to the CJS/ESM source in "dist", to support
// on-going package development (e.g. running tests, supporting npm link, etc.).
// when publishing from "dist" however, we need to update the package.json
// to point to the files within the same directory.
for (const key of ['main', 'module', 'types']) {
  packageJson[key] = packageJson[key].replace('./dist/', '')
}

const distPackageJson = JSON.stringify(packageJson, null, 2) + '\n'
fs.writeFileSync(`${distRoot}/package.json`, distPackageJson)

// copy relevant files into "dist"
const srcDir = `${__dirname}/..`
const destDir = `${srcDir}/dist`
fs.copyFileSync(`${srcDir}/README.md`, `${destDir}/README.md`)
fs.copyFileSync(`${srcDir}/LICENSE`, `${destDir}/LICENSE`)
