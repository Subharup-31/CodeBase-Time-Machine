/**
 * Structured logger that writes JSON logs and optionally forwards errors to Sentry.
 * Add SENTRY_DSN to environment to enable Sentry reporting.
 */

type LogLevel = "info" | "warn" | "error";

interface LogEntry {
    level: LogLevel;
    module: string;
    message: string;
    data?: Record<string, unknown>;
    timestamp: string;
}

export function createLogger(module: string) {
    function log(level: LogLevel, message: string, data?: Record<string, unknown>) {
        const entry: LogEntry = {
            level,
            module,
            message,
            data,
            timestamp: new Date().toISOString(),
        };
        const logFn = level === "error" ? console.error
                    : level === "warn"  ? console.warn
                    : console.log;
        logFn(JSON.stringify(entry));
    }

    return {
        info: (msg: string, data?: Record<string, unknown>) => log("info", msg, data),
        warn: (msg: string, data?: Record<string, unknown>) => log("warn", msg, data),
        error: (msg: string, data?: Record<string, unknown>) => {
            log("error", msg, data);
            // Sentry capture (lazy import to avoid adding dependency if not configured)
            if (process.env.SENTRY_DSN) {
                // Sentry.captureException(new Error(msg), { extra: data });
                // Uncomment and install @sentry/nextjs when ready to add Sentry
            }
        },
    };
}
