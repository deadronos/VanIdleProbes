import { defineConfig } from 'eslint/config';
import js from '@eslint/js';
import globals from 'globals';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default defineConfig([
	// Base JavaScript recommended rules
	js.configs.recommended,

	// TypeScript recommended (flat) — this exports an array of config objects
	...tsPlugin.configs['flat/recommended'],

	// React hooks flat config
	// use the flat "recommended-latest" variant from the react-hooks plugin
	reactHooks.configs.flat['recommended-latest'],

	// Vite-specific react-refresh rules (optional but helpful for dev)
	reactRefresh.configs.vite,

	// Project-specific final overrides
	{
		ignores: ['dist', 'node_modules', 'temp-tsc-out'],
		languageOptions: {
			ecmaVersion: 2022,
			sourceType: 'module',
			globals: globals.browser,
		},
		settings: {
			react: { version: 'detect' },
		},
		rules: {
			'no-console': 'warn',
			'no-debugger': 'warn',
			'quotes': ['error', 'single', { avoidEscape: true }],
			'semi': ['error', 'always'],
			'prefer-const': 'error',
		},
	},
]);
