export interface LoggerOptions {
  level?: "debug" | "info" | "warn" | "error";
}

export interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

const levels = { debug: 0, info: 1, warn: 2, error: 3 } as const;

export function createLogger(name: string, options: LoggerOptions = {}): Logger {
  const minLevel = levels[options.level ?? "info"];

  function emit(level: keyof typeof levels, message: string, args: unknown[]): void {
    if (levels[level] >= minLevel) {
      const line = `[${level.toUpperCase()}] [${name}] ${message}`;
      if (args.length > 0) {
        console[level](line, ...args);
      } else {
        console[level](line);
      }
    }
  }

  return {
    debug: (msg, ...args) => emit("debug", msg, args),
    info:  (msg, ...args) => emit("info",  msg, args),
    warn:  (msg, ...args) => emit("warn",  msg, args),
    error: (msg, ...args) => emit("error", msg, args),
  };
}

const registry = new Map<string, Logger>();

export function getOrCreateLogger(name: string, options?: LoggerOptions): Logger {
  if (!registry.has(name)) {
    registry.set(name, createLogger(name, options));
  }
  return registry.get(name)!;
}

export const logger = getOrCreateLogger("root");
