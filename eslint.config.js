import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { defineConfig } from 'eslint/config';

const commonRules = {
	curly: ['error', 'all'],
	semi: ['error', 'always'],
	quotes: ['error', 'single'],
	indent: ['error', 'tab'],
	'comma-dangle': ['error', 'always-multiline'],
	'brace-style': 'error',
	'keyword-spacing': ['error', { before: true, after: true }],
	'space-before-blocks': ['error', 'always'],
	'template-curly-spacing': 'error',
	'object-curly-spacing': ['error', 'always', { arraysInObjects: true, objectsInObjects: true }],
	'array-bracket-spacing': ['error', 'never'],
	'multiline-ternary': ['error', 'always-multiline'],
	'eol-last': ['error', 'always'],
	'no-multiple-empty-lines': ['error', { max: 1, maxEOF: 0 }],
	'linebreak-style': ['error', 'unix'],
	'no-trailing-spaces': 'error',
	'object-curly-newline': ['error', {
		ObjectExpression: { consistent: true, multiline: true },
		ObjectPattern: { multiline: true },
		ImportDeclaration: { multiline: true },
		ExportDeclaration: 'always',
	}],
	'object-property-newline': ['error', { allowAllPropertiesOnSameLine: true }],
	'space-before-function-paren': 'error',
};

export default defineConfig([
	// JS
	{
		files: ['**/*.{js,mjs,cjs}'],
		plugins: { js },
		extends: [js.configs.recommended],
		languageOptions: {
			globals: globals.node,
		},
		rules: commonRules,
	},

	// TS
	{
		files: ['**/*.{ts,tsx}'],
		languageOptions: {
			parser: tseslint.parser,
			parserOptions: {
				project: './tsconfig.json',
				tsconfigRootDir: import.meta.dirname,
			},
			globals: globals.node,
		},
		plugins: {
			'@typescript-eslint': tseslint.plugin,
		},
		extends: [
			...tseslint.configs.recommended,
		],
		rules: {
			...commonRules,
			'@typescript-eslint/consistent-type-imports': ['error', {
				prefer: 'type-imports',
				disallowTypeAnnotations: true,
			}],
		},
	},
]);
