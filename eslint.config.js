import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

const browserApis = ['localStorage', 'sessionStorage', 'indexedDB'];

export default defineConfig(
  { ignores: ['dist/', 'node_modules/', 'coverage/'] },
  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-restricted-properties': [
        'error',
        { property: 'innerHTML', message: 'Usa nodos y textContent.' },
        { property: 'outerHTML', message: 'Usa nodos y textContent.' },
        { property: 'insertAdjacentHTML', message: 'Usa nodos y textContent.' },
        { object: 'Math', property: 'random', message: 'Usa core/rng.ts con semilla.' },
        { object: 'document', property: 'write', message: 'Prohibido.' },
        { object: 'window', property: 'localStorage', message: 'Solo desde src/save/.' },
      ],
      'no-restricted-globals': [
        'error',
        ...browserApis.map((name) => ({ name, message: 'Solo desde src/save/.' })),
      ],
    },
  },
  {
    files: ['src/save/**'],
    rules: { 'no-restricted-globals': 'off', 'no-restricted-properties': 'off' },
  },
  {
    files: ['src/game/**', 'src/core/**', 'src/validation/**', 'src/data/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        { paths: [{ name: 'three', message: 'La lógica no importa three.' }] },
      ],
    },
  },
  {
    files: ['**/*.js'],
    extends: [tseslint.configs.disableTypeChecked],
  },
);
