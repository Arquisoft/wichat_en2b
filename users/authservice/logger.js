// logger.js
const pino = require('pino');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  timestamp: pino.stdTimeFunctions.isoTime,
  // Use this for readable logs, ONLY for development. 
  prettyPrint: process.env.NODE_ENV !== 'production' 
}, pino.destination({ dest: './combined.log', sync: false }));

module.exports = logger