const { getDefaultConfig } = require('expo/metro-config');
const { withMetroConfig } = require('react-native-monorepo-config');
const path = require('path');

const root = path.resolve(__dirname, '..');

// Resolves the library from ../src instead of the published lib/, so a change in
// the library is visible in the example without a rebuild.
module.exports = withMetroConfig(getDefaultConfig(__dirname), {
  root,
  dirname: __dirname,
});
