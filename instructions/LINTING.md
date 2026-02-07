# Linting Guide

This guide explains how to lint your NoEgo project using Forge's smart linting system.

---

## Quick Start

```bash
# Lint all Svelte components discovered from route config
npm run forge:lint

# Lint and auto-fix problems
npm run forge:lint:fix

# Lint all TypeScript/JavaScript (standard ESLint)
npm run lint
```

**Note**: `forge:lint` is for Svelte/frontend files with smart dependency analysis.
Use `npm run lint` for general TypeScript/JavaScript linting.

---

## How Forge Lint Works

Forge lint is smarter than standard ESLint - it uses **dependency analysis** to lint files and their dependencies together.

### Discovery Modes

1. **Route-based discovery** (default): Reads `ui/stitch.yaml` or `openapi.yaml` to find all page components, then traces their dependencies.

2. **File-specific**: Lint specific files and their dependencies:
   ```bash
   npx forge lint src/ui/pages/dashboard/main.svelte
   ```

3. **Fallback**: If no route config found, uses `src/**/*.{svelte,ts,js}`

### Dependency Analysis

When you lint a file, Forge automatically includes all imported files:

```bash
# This lints main.svelte AND all files it imports
npx forge lint src/ui/pages/dashboard/main.svelte
```

To skip dependency analysis:
```bash
npx forge lint --no-deps src/ui/lib/utils.ts
```

---

## Commands

### Lint All Svelte Components
```bash
npm run forge:lint
# or
npx forge lint
```

### Lint with Auto-fix
```bash
npm run forge:lint:fix
# or
npx forge lint --fix
```

### Lint All TypeScript/JavaScript
```bash
npm run lint
# or
npx eslint src
```

### Show Warnings
By default, only errors are shown. To see warnings:
```bash
npx forge lint --warnings
# or
npx forge lint -w
```

### Lint Specific Files
```bash
# Lint a component and its dependencies
npx forge lint src/ui/pages/login/main.svelte

# Lint multiple files
npx forge lint src/ui/pages/login/main.svelte src/ui/pages/signup/main.svelte

# Lint a file without dependencies
npx forge lint --no-deps src/ui/lib/utils.ts
```

---

## ESLint Configuration

Forge uses your project's `eslint.config.js`. The generated config includes:

```javascript
import globals from 'globals';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import sveltePlugin from 'eslint-plugin-svelte';
import svelteParser from 'svelte-eslint-parser';

export default [
  // TypeScript files
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: { ...globals.node, ...globals.browser },
    },
    plugins: { '@typescript-eslint': tsPlugin },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  // Svelte files
  {
    files: ['**/*.svelte'],
    languageOptions: {
      parser: svelteParser,
      parserOptions: {
        parser: tsParser,
      },
    },
    plugins: { svelte: sveltePlugin },
    rules: {
      ...sveltePlugin.configs.recommended.rules,
    },
  },
];
```

---

## Common Lint Rules

### Unused Variables
```typescript
// Error: 'unused' is defined but never used
const unused = 'hello';

// OK: Prefix with underscore to ignore
const _intentionallyUnused = 'hello';
```

### Svelte Reactivity
```svelte
<script lang="ts">
  // Error: Reactive statement should use $state or $derived
  let count = 0;

  // OK: Use runes
  let count = $state(0);
  let doubled = $derived(count * 2);
</script>
```

### Type Imports
```typescript
// Error: Type should use 'import type'
import { User } from './types';

// OK: Use type-only import
import type { User } from './types';
```

---

## CI Integration

Add linting to your CI pipeline:

```yaml
# .github/workflows/ci.yml
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run lint
```

---

## Troubleshooting

### "ESLint not installed"
```bash
npm install eslint eslint-plugin-svelte @typescript-eslint/parser @typescript-eslint/eslint-plugin
```

### "Cannot find module" errors
Ensure your `eslint.config.js` exists and is valid ESM:
```bash
# Check config
npx eslint --print-config src/index.ts
```

### Circular dependency warnings
Forge reports circular dependencies as warnings. While not always problematic, they can indicate architectural issues:
```
Warning: Circular dependency detected: A.ts -> B.ts -> A.ts
```

---

## Best Practices

1. **Run lint before commit**: Add to pre-commit hook or CI
2. **Use --fix for formatting**: Let ESLint handle style issues
3. **Address warnings**: Don't let them accumulate
4. **Keep eslint.config.js simple**: Only add rules you need
5. **Lint specific files during development**: Faster feedback
