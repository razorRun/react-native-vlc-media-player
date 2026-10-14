/**
 * Parses the native component spec with React Native's own codegen parser and
 * prints the resulting schema.
 *
 * Phase 2a ships the spec before codegen is wired up natively, so nothing else
 * would notice if the spec drifted out of what codegen accepts. Running the real
 * parser here means Phase 2b/2c cannot be blocked by a spec that never parsed.
 *
 * Usage: node scripts/check-codegen-spec.js [--json]
 */

'use strict';

const fs = require('fs');
const path = require('path');

const SPEC = path.join(
  __dirname,
  '..',
  'src',
  'VlcPlayerViewNativeComponent.ts'
);

function loadParser() {
  // The package exposes src/ in the repo checkout and lib/ when installed.
  for (const entry of [
    '@react-native/codegen/lib/parsers/typescript/parser',
    '@react-native/codegen/src/parsers/typescript/parser',
  ]) {
    try {
      return require(entry).TypeScriptParser;
    } catch {
      // try the next one
    }
  }
  throw new Error(
    'Could not load @react-native/codegen. Is react-native installed?'
  );
}

function main() {
  const TypeScriptParser = loadParser();
  const code = fs.readFileSync(SPEC, 'utf8');

  let schema;
  try {
    schema = new TypeScriptParser().parseString(code, path.basename(SPEC));
  } catch (error) {
    console.error(`codegen rejected ${path.relative(process.cwd(), SPEC)}:`);
    console.error(`  ${error.message}`);
    process.exit(1);
  }

  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(schema, null, 2));
    return;
  }

  let components = 0;
  for (const [libraryName, module] of Object.entries(schema.modules)) {
    for (const [name, component] of Object.entries(module.components ?? {})) {
      components++;
      console.log(`${name}  (library ${libraryName})`);
      if (component.paperComponentName) {
        // The static view config then carries the paper name on Fabric too, and
        // Fabric no longer finds the component. See MODERNIZATION.md, Phase 2d.
        console.error(
          `  paperComponentName is set (${component.paperComponentName}); ` +
            'both architectures must use the component name'
        );
        process.exit(1);
      }
      console.log(`  props    (${component.props.length})`);
      console.log(`    ${component.props.map((p) => p.name).join(', ')}`);
      console.log(`  events   (${component.events.length})`);
      console.log(`    ${component.events.map((e) => e.name).join(', ')}`);
      console.log(`  commands (${component.commands.length})`);
      console.log(`    ${component.commands.map((c) => c.name).join(', ')}`);
    }
  }

  if (components === 0) {
    console.error('codegen parsed the spec but found no component.');
    process.exit(1);
  }

  crossCheckNative(schema);
}

/** Names the native view managers declare, scraped from the sources. */
const isEventBlock = (type) =>
  type === 'RCTDirectEventBlock' || type === 'RCTBubblingEventBlock';

function nativeDeclarations() {
  const root = path.join(__dirname, '..');
  const read = (relative) => {
    const file = path.join(root, relative);
    if (!fs.existsSync(file)) {
      throw new Error(
        `${relative} is gone. The scraper in scripts/check-codegen-spec.js has to ` +
          'follow the native layout; update it rather than deleting the check.'
      );
    }
    return fs.readFileSync(file, 'utf8');
  };

  const androidManager = read(
    'android/src/main/java/com/yuanzhou/vlc/vlcplayer/VlcPlayerViewManager.kt'
  );
  const androidEvents = read(
    'android/src/main/java/com/yuanzhou/vlc/vlcplayer/VideoEventEmitter.kt'
  );
  const iosManager = read('ios/RCTVLCPlayerManager.mm');
  const iosCore = read('ios/VlcPlayerView.swift');

  const all = (source, re) =>
    [...source.matchAll(re)].map((m) => m[1]).filter(Boolean);

  // @ReactProp(name = PROP_X) resolves through a constant, so read the constants.
  const androidConstants = new Map(
    [...androidManager.matchAll(/const val (PROP_\w+)\s*=\s*"(\w+)"/g)].map(
      (m) => [m[1], m[2]]
    )
  );
  const androidProps = all(
    androidManager,
    /@ReactProp\(\s*name = (PROP_\w+)/g
  ).map((constant) => androidConstants.get(constant) ?? constant);

  // The authoritative Android list is the Events array, not every EVENT_*
  // constant — EVENT_PROP_* are payload field names.
  const androidEventConstants = new Map(
    [...androidEvents.matchAll(/const val (EVENT_\w+)\s*=\s*"(\w+)"/g)].map(
      (m) => [m[1], m[2]]
    )
  );
  const eventsArray = androidEvents.match(/val Events = arrayOf\(([^)]*)\)/);
  const androidEventNames = eventsArray
    ? all(eventsArray[1], /(EVENT_\w+)/g)
        .map((c) => androidEventConstants.get(c))
        .filter(Boolean)
    : [];

  const iosViewProperties = [
    ...iosManager.matchAll(
      /RCT_(?:EXPORT|CUSTOM)_VIEW_PROPERTY\(\s*(\w+)\s*,\s*(\w+)/g
    ),
  ].map((m) => [m[1], m[2]]);

  return {
    iosCore,
    android: {
      props: androidProps,
      events: androidEventNames,
    },
    ios: {
      // The legacy adapter exports events as view properties too, so they are told
      // apart by their declared type rather than by name.
      props: iosViewProperties
        .filter(([, type]) => !isEventBlock(type))
        .map(([name]) => name),
      events: iosViewProperties
        .filter(([, type]) => isEventBlock(type))
        .map(([name]) => name),
    },
  };
}

/**
 * Every event the legacy adapter exports has to exist as a closure on the Swift
 * core, otherwise the adapter binds a block onto nothing and the event is lost
 * without a word.
 */
function crossCheckSwiftCore(iosEvents, iosCore) {
  const declared = new Set(
    [...iosCore.matchAll(/@objc public var (on\w+):/g)].map((m) => m[1])
  );
  return iosEvents.filter((name) => !declared.has(name));
}

/**
 * Fails when a platform declares something the spec does not. That is the
 * dangerous direction: once codegen generates a static view config, a prop
 * missing from the spec silently stops arriving.
 */
function crossCheckNative(schema) {
  const component = Object.values(schema.modules)
    .flatMap((module) => Object.values(module.components ?? {}))
    .at(0);
  const specProps = new Set(component.props.map((p) => p.name));
  const specEvents = new Set(component.events.map((e) => e.name));

  const native = nativeDeclarations();
  const problems = [];

  const missingOnCore = crossCheckSwiftCore(native.ios.events, native.iosCore);
  if (missingOnCore.length > 0) {
    problems.push(
      'the legacy iOS adapter exports events the Swift core does not declare: ' +
        missingOnCore.join(', ')
    );
  }

  for (const [platform, declared] of Object.entries(native)) {
    if (platform === 'iosCore') {
      continue;
    }
    for (const [kind, names] of Object.entries(declared)) {
      if (names.length === 0) {
        problems.push(
          `found no ${kind} declarations for ${platform} — the scraper in ` +
            'scripts/check-codegen-spec.js needs updating for the new native layout'
        );
        continue;
      }
      const spec = kind === 'props' ? specProps : specEvents;
      const missing = names.filter((name) => !spec.has(name));
      if (missing.length > 0) {
        problems.push(
          `${platform} declares ${kind} the spec does not: ${missing.join(', ')}`
        );
      }
    }
  }

  console.log('');
  if (problems.length > 0) {
    for (const problem of problems) {
      console.error(`  ${problem}`);
    }
    process.exit(1);
  }
  console.log(
    'spec covers every prop and event the native view managers declare.'
  );
}

main();
