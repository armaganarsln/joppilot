import { defineConfig } from 'vitest/config';

// Runs ONLY the Firestore security-rules tests, against the emulator.
// Invoked by `npm run test:rules` inside `firebase emulators:exec`.
export default defineConfig({
  test: {
    include: ['**/*.rules.test.ts'],
  },
});
