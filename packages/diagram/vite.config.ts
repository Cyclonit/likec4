import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import { shadowStyle } from 'vite-plugin-shadow-style'

/** @type {import('vite').UserConfig} */
export default defineConfig(({ mode }) => {
  return {
    plugins: [
      vanillaExtractPlugin(),
      react()
      // dts({ include: ['bundle'] })
    ],
    resolve: {
      dedupe: ['react', 'react-dom', 'react/jsx-runtime']
    },
    esbuild: {
      exclude: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        'scheduler',
        '@likec4/core',
        '@mantine/core',
        '@mantine/hooks'
      ]
    },
    // optimizeDeps: {
    //   esbuildOptions: {
    //     plugins: [veEsbuild({runtime: false})]
    //   }
    // },
    define: {
      'process.env.NODE_ENV': JSON.stringify('production')
    },
    build: {
      outDir: 'bundle',

      lib: {
        entry: resolve(__dirname, 'src/bundle.ts'),
        fileName: 'index',
        formats: ['es']
      },
      minify: false,
      emptyOutDir: true,
      cssCodeSplit: false,
      cssMinify: false,
      sourcemap: true,
      target: 'esnext',
      // minify: false,
      rollupOptions: {
        treeshake: 'smallest',
        external: [
          'react',
          'react-dom',
          'react/jsx-runtime',
          'scheduler',
          '@likec4/core',
          '@mantine/core',
          '@mantine/hooks'
        ],
        plugins: [shadowStyle()]
      },
      cssTarget: 'esnext'
    }
  }
})
