const pino = require('pino');
const pretty = require('pino-pretty');
const fs = require('fs');

// Configuración de pino-pretty para la consola
const prettyStream = pretty({
  colorize: true, // Colorea la salida
  translateTime: 'SYS:standard', // Usa el formato de tiempo estándar
  ignore: 'pid,hostname' // Ignora estos campos en la salida
});

// Configuración del stream para el archivo de log
const logFileStream = fs.createWriteStream('./logger.log', { flags: 'a' });

// Logger que escribe tanto en la consola como en el archivo de log
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  timestamp: pino.stdTimeFunctions.isoTime,
}, pino.multistream([
  { stream: prettyStream }, // Salida formateada para la consola
  { stream: logFileStream } // Salida sin formato para el archivo de log
]));

module.exports = logger;