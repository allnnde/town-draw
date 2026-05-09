import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    {
      name: 'town-draw:escape-windows-test-paths',
      configResolved(config) {
        const include = config.test?.include;

        if (!include) {
          return;
        }

        config.test.include = include.map((pattern) =>
          pattern.replaceAll('(', '\\(').replaceAll(')', '\\)'),
        );
      },
    },
  ],
});
