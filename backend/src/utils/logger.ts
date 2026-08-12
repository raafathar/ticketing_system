import winston from 'winston';

const { combine, timestamp, printf, colorize, json } = winston.format;

const devFormat = printf(({ level, message, timestamp: ts, ...meta }) => {
  const extra = Object.keys(meta).length ? JSON.stringify(meta) : '';
  return `${ts} [${level}]: ${message} ${extra}`;
});

const isProd = process.env.NODE_ENV === 'production';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'http',
  format: isProd
    ? combine(timestamp(), json())
    : combine(timestamp(), colorize({ all: true }), devFormat),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
  exitOnError: false,
});

export default logger;
