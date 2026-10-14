/**
 * Runs React Native's codegen Babel plugin over every source file, the way a
 * consuming app's Metro build does.
 *
 * The plugin is part of @react-native/babel-preset and therefore runs on every
 * file of every app, not just on the spec. It rejects some perfectly valid
 * TypeScript — `export { Commands as X } from …` anywhere, for instance — and
 * nothing else in this repo's build runs it: bob copies the spec verbatim and
 * leaves the transform to the app. Without this check such an error surfaces
 * only when someone bundles an app.
 *
 * Usage: node scripts/check-babel-codegen.js
 */

'use strict';

const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');

const SRC = path.join(__dirname, '..', 'src');

function sourceFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return entry.name === '__tests__' ? [] : sourceFiles(full);
    }
    return /\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

let failures = 0;
let viewConfigs = 0;
for (const file of sourceFiles(SRC)) {
  const relative = path.relative(process.cwd(), file);
  try {
    const { code } = babel.transformFileSync(file, {
      babelrc: false,
      configFile: false,
      parserOpts: { plugins: ['typescript', 'jsx'] },
      plugins: ['@react-native/babel-plugin-codegen'],
    });
    if (code.includes('__INTERNAL_VIEW_CONFIG')) {
      viewConfigs++;
      console.log(`${relative}: static view config generated`);
    }
  } catch (error) {
    failures++;
    console.error(`${relative}:\n  ${error.message.split('\n')[0]}`);
  }
}

if (failures > 0) {
  process.exit(1);
}
if (viewConfigs === 0) {
  console.error(
    'the codegen plugin generated no static view config — the spec is no longer ' +
      'recognised as one (it has to be named *NativeComponent.ts and default-export ' +
      'codegenNativeComponent(...))'
  );
  process.exit(1);
}
console.log('every source file passes the codegen Babel plugin.');
