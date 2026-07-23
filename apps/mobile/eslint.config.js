// Expo's own flat ESLint config (handles React Native globals + React rules).
// Kept separate from @repo/eslint-config because the RN environment differs
// from the Node/browser presets the API and shared packages use.
const expoConfig = require("eslint-config-expo/flat");

module.exports = [
  ...expoConfig,
  {
    ignores: ["dist/*", ".expo/*", "node_modules/*"],
  },
];
