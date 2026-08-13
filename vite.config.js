import { defineConfig } from 'vite'

let plugins = []
try {
  const reactModule = await import('@vitejs/plugin-react')
  const react = reactModule.default || reactModule
  plugins.push(react())
} catch (e) {
  // Built-in esbuild JSX fallback if @vitejs/plugin-react is not installed
}

// https://vite.dev/config/
export default defineConfig({
  plugins,
  esbuild: {
    jsx: 'automatic',
  },
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.js',
  },
})
