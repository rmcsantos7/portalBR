/**
 * Logger Customizado
 * Diferentes níveis: info, error, warn, debug
 */

const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

const LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

const getCurrentTimestamp = () => {
  return new Date().toISOString();
};

const shouldLog = (level) => LEVELS[level] <= LEVELS[LOG_LEVEL];

const formatMessage = (level, message, data = {}) => {
  const timestamp = getCurrentTimestamp();
  const dataStr = Object.keys(data).length > 0 ? JSON.stringify(data) : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message} ${dataStr}`;
};

const logger = {
  error: (message, data) => {
    if (shouldLog('error')) {
      console.error(formatMessage('error', message, data));
    }
  },
  warn: (message, data) => {
    if (shouldLog('warn')) {
      console.warn(formatMessage('warn', message, data));
    }
  },
  info: (message, data) => {
    if (shouldLog('info')) {
      console.log(formatMessage('info', message, data));
    }
  },
  debug: (message, data) => {
    if (shouldLog('debug')) {
      console.log(formatMessage('debug', message, data));
    }
  }
};

module.exports = logger;
