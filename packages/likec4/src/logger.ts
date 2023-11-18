import { normalizeError } from '@likec4/core'
import k from 'picocolors'
import prettyMilliseconds from 'pretty-ms'
import type { LogErrorOptions, LogOptions, Logger } from 'vite'
import { createLogger } from 'vite'

const ERROR = k.bold(k.bgRed(k.white('ERROR')))
const WARN = k.bold(k.yellow('WARN'))
const INFO = k.bold(k.green('INFO'))

export function createLikeC4Logger(prefix: string) {
  const logger = createLogger('info', {
    prefix
  })

  return {
    ...logger,
    info(msg: string, options?: LogOptions) {
      logger.info(`${INFO} ${msg}`, {
        timestamp: true,
        ...options
      })
    },
    warn(msg: string, options?: LogOptions) {
      logger.warn(`${WARN} ${msg}`, {
        timestamp: true,
        ...options
      })
    },
    error(err: unknown, options?: LogErrorOptions) {
      if (typeof err === 'string') {
        logger.error(`${ERROR} ${err}`, {
          timestamp: true,
          ...options
        })
        return
      }
      const error = normalizeError(err)
      logger.error(`${ERROR} ${error.stack ?? error.message}`, {
        timestamp: true,
        error,
        ...options
      })
    }
  }
}

const NS_PER_MS = 1e6

export function startTimer(logger: Logger) {
  const start = process.hrtime()
  return {
    stopAndLog(msg = '✓ done in ') {
      const [seconds, nanoseconds] = process.hrtime(start)
      const ms = seconds * 1000 + nanoseconds / NS_PER_MS
      logger.info(k.green(`${msg}${prettyMilliseconds(ms)}`))
    }
  }
}
