const pino = require('pino');

const isProd = process.env.NODE_ENV === 'production';

const logger = pino(isProd ? {} : {
    transport: {
        target: 'pino-pretty',
        options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname'
        }
    }
});

function logSOC(level, component, message, metadata = {}) {
    // Map SUCCESS to info for pino
    const pinoLevel = level.toLowerCase() === 'success' ? 'info' : level.toLowerCase();
    
    if (logger[pinoLevel]) {
        logger[pinoLevel]({ component, ...metadata }, message);
    } else {
        logger.info({ component, level, ...metadata }, message);
    }
}

module.exports = { logSOC, logger };
