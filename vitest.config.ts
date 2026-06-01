import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // The Firestore rules tests (*.rules.test.ts) need the emulator (Java), so
    // they are excluded from the default `npm test` run and executed separately
    // via `npm run test:rules` (which boots the emulator first).
    exclude: ['**/node_modules/**', '**/*.rules.test.ts'],
  },
});
