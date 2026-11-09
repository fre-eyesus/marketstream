type LogLevel = "fatal" | "error" | "warn" | "info" | "debug" | "trace";

const LEVEL_ORDER: Record<LogLevel, number> = {
  fatal: 60,
  error: 50,
  warn: 40,
  info: 30,
  debug: 20,
  trace: 10,
};

export interface Logger {
  child(bindings: Record<string, unknown>): Logger;
  fatal(msg: string, extra?: Record<string, unknown>): void;
  error(msg: string, extra?: Record<string, unknown>): void;
  warn(msg: string, extra?: Record<string, unknown>): void;
  info(msg: string, extra?: Record<string, unknown>): void;
  debug(msg: string, extra?: Record<string, unknown>): void;
  trace(msg: string, extra?: Record<string, unknown>): void;
}

function write(
  level: LogLevel,
  minLevel: LogLevel,
  service: string,
  bindings: Record<string, unknown>,
  msg: string,
  extra?: Record<string, unknown>
): void {
  if (LEVEL_ORDER[level] < LEVEL_ORDER[minLevel]) return;
  const line = {
    level,
    time: new Date().toISOString(),
    service,
    msg,
    ...bindings,
    ...extra,
  };
  const out = level === "error" || level === "fatal" ? console.error : console.log;
  out(JSON.stringify(line));
}

export function createLogger(options: {
  service: string;
  level?: LogLevel;
  bindings?: Record<string, unknown>;
}): Logger {
  const minLevel = options.level ?? "info";
  const bindings = options.bindings ?? {};

  const make = (extraBindings: Record<string, unknown>): Logger => ({
    child(childBindings) {
      return make({ ...extraBindings, ...childBindings });
    },
    fatal: (msg, extra) =>
      write("fatal", minLevel, options.service, extraBindings, msg, extra),
    error: (msg, extra) =>
      write("error", minLevel, options.service, extraBindings, msg, extra),
    warn: (msg, extra) =>
      write("warn", minLevel, options.service, extraBindings, msg, extra),
    info: (msg, extra) =>
      write("info", minLevel, options.service, extraBindings, msg, extra),
    debug: (msg, extra) =>
      write("debug", minLevel, options.service, extraBindings, msg, extra),
    trace: (msg, extra) =>
      write("trace", minLevel, options.service, extraBindings, msg, extra),
  });

  return make(bindings);
}
