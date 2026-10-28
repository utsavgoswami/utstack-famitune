import baseConfig from '../../eslint.config.mjs';

// NOTE: @nx/eslint-plugin's flat/react preset (eslint-plugin-react,
// eslint-plugin-react-hooks) is not yet compatible with this workspace's
// ESLint 10, so only the base config is composed here. Re-add the React
// preset when those plugins support ESLint 10.
export default [
  ...baseConfig,
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    // Override or add rules here
    rules: {},
  },
];
