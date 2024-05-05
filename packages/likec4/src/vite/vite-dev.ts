import { viteConfig } from '@/vite/config'
import type { LikeC4ViteConfig } from '@/vite/config.prod'
import { viteWebcomponentConfig } from '@/vite/webcomponent'
import consola from 'consola'
import getPort, { portNumbers } from 'get-port'
import type { ViteDevServer } from 'vite'
import { build, createServer } from 'vite'
import { printServerUrls } from './printServerUrls'
import { mkTempPublicDir } from './utils'

export async function viteDev({
  webcomponentPrefix = 'likec4',
  ...cfg
}: LikeC4ViteConfig): Promise<ViteDevServer> {
  const { isDev, languageServices, ...config } = await viteConfig({
    ...cfg,
    webcomponentPrefix
  })
  const port = await getPort({
    port: [
      5173,
      ...portNumbers(61000, 61010),
      ...portNumbers(62002, 62010)
    ]
  })
  const hmrPort = await getPort({
    port: portNumbers(24678, 24690)
  })

  const publicDir = await mkTempPublicDir()

  let webcomponentPromise: Promise<unknown> | undefined
  if (!isDev) {
    const webcomponentConfig = await viteWebcomponentConfig({
      webcomponentPrefix,
      languageServices: languageServices,
      outDir: publicDir,
      base: config.base
    })
    // don't wait, we want to start the server asap
    webcomponentPromise = build({
      ...webcomponentConfig,
      logLevel: 'warn'
    }).catch((err) => {
      consola.warn('webcomponent build failed', err)
      consola.warn('Ignoring error and continuing')
      return Promise.resolve()
    })
  }

  // languageServices.onModelUpdate(() => {
  //   consola.info('watcher onModelUpdate')
  //   watcher.emit('event', {code: 'START'})
  //   watcher.emit('change', 'virtual:likec4/views', {event: 'update'})
  // })

  const server = await createServer({
    ...config,
    publicDir,
    server: {
      host: '0.0.0.0',
      port,
      warmup: {
        clientFiles: [
          './src/**/*.{js,tsx}'
        ]
      },
      hmr: {
        overlay: true,
        // needed for hmr to work over network aka WSL2
        // host: 'localhost',
        port: hmrPort
      },
      fs: {
        strict: false
      },
      open: !isDev
    }
  })

  await server.listen()

  server.config.logger.clearScreen('info')
  printServerUrls(server)

  if (webcomponentPromise) {
    await webcomponentPromise
  }

  return server
}
