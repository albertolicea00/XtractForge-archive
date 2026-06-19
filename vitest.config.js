import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Pure logic (lib/, plugins, managers) — no DOM needed.
    environment: 'node',
    globals: true,
    include: ['tests/**/*.test.js'],
  },
});
