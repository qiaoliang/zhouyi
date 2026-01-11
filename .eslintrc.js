module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  env: {
    browser: true,
    es2020: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:prettier/recommended',
  ],
  plugins: ['@typescript-eslint', 'react', 'react-hooks', 'prettier'],
  settings: {
    react: {
      version: 'detect',
    },
  },
  rules: {
    // React 规则
    'react/react-in-jsx-scope': 'off', // React 17+ 不需要导入 React
    'react/prop-types': 'off', // 使用 TypeScript，不需要 prop-types
    'react/display-name': 'off', // 允许匿名组件

    // TypeScript 规则
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/ban-ts-comment': 'warn',

    // Prettier 规则
    'prettier/prettier': 'error',

    // 通用规则
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'no-debugger': 'warn',
  },
  overrides: [
    // React Native 特定配置
    {
      files: ['**/apps/native/**/*.{ts,tsx}'],
      env: {
        'react-native/react-native': true,
      },
    },
    // 小程序特定配置
    {
      files: ['**/apps/miniprogram/**/*.{ts,tsx}'],
      rules: {
        'react/react-in-jsx-scope': 'off',
      },
    },
  ],
};
