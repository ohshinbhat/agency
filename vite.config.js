import { defineConfig } from 'vite';

export default defineConfig({
  appType: 'mpa',
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [{ name: 'three', test: /[\\/]node_modules[\\/]three[\\/]/, maxSize: 500_000 }],
        },
      },
    },
  },
});
