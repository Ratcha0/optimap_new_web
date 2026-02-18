
const IS_PRODUCTION = import.meta.env.PROD;
class Logger {
    log(message, data = {}) {
        if (!IS_PRODUCTION) {
            console.log(`[LOG] ${message}`, data);
        }
    }

    error(error, context = {}) {
        const errorDetails = {
            message: error.message,
            stack: error.stack,
            url: window.location.href,
            timestamp: new Date().toISOString(),
            ...context
        };

        if (!IS_PRODUCTION) {
            console.error(`[ERROR]`, errorDetails);
        } else {
            console.error(`[PRODUCTION ERROR]`, error.message);
        }
    }

    warn(message, data = {}) {
        if (!IS_PRODUCTION) {
            console.warn(`[WARN] ${message}`, data);
        }
    }

    info(message, data = {}) {
        if (!IS_PRODUCTION) {
            console.info(`[INFO] ${message}`, data);
        }
    }
}

export const logger = new Logger();
