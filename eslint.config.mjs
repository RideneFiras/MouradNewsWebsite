import next from 'eslint-config-next';
import nextTs from 'eslint-config-next/typescript';

const config = [
  ...next,
  ...nextTs,
  {
    ignores: ['.next/**', '.open-next/**', '.wrangler/**', 'node_modules/**', 'cloudflare-env.d.ts', 'next-env.d.ts', 'playwright-report/**', 'test-results/**'],
  },
  {
    rules: {
      // Direction must use logical properties (docs/02-design-system.md).
      'no-restricted-syntax': [
        'error',
        {
          selector: "Literal[value=/(^|\\s)(ml|mr|pl|pr|left|right)-[0-9a-z[]/]",
          message: 'Use logical utilities (ms-/me-/ps-/pe-/start-/end-) instead of left/right.',
        },
      ],
    },
  },
];
export default config;
