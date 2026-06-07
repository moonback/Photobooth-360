type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LogPayload = unknown;

const isProduction = import.meta.env.PROD;

function emit(level: LogLevel, message: string, payload?: LogPayload) {
  if (isProduction && level !== 'error' && level !== 'warn') return;

  const args = payload === undefined ? [message] : [message, payload];

  if (level === 'error') {
    console.error(...args);
    return;
  }

  if (level === 'warn') {
    console.warn(...args);
    return;
  }

  console.log(...args);
}

export const logger = {
  debug: (message: string, payload?: LogPayload) => emit('debug', message, payload),
  info: (message: string, payload?: LogPayload) => emit('info', message, payload),
  warn: (message: string, payload?: LogPayload) => emit('warn', message, payload),
  error: (message: string, payload?: LogPayload) => emit('error', message, payload),
};
