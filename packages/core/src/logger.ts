import { pino, type Logger } from 'pino';
import { loadConfig } from './config.js';

let rootLogger: Logger | undefined;

/** Process-wide structured logger. Pretty in dev, JSON elsewhere. */
export function getLogger(): Logger {
  if (rootLogger) return rootLogger;
  const cfg = loadConfig();
  rootLogger = pino({
    level: cfg.LOG_LEVEL,
    base: { env: cfg.NODE_ENV },
    ...(cfg.NODE_ENV === 'development'
      ? { transport: { target: 'pino-pretty', options: { colorize: true } } }
      : {}),
  });
  return rootLogger;
}

/** Child logger bound to a named component (e.g. service name). */
export function childLogger(component: string): Logger {
  return getLogger().child({ component });
}
