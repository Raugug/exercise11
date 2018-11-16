const { createLogger, format, transports } = require('winston');

const levels = { 
    error: 0, 
    warn: 1, 
    info: 2, 
    verbose: 3, 
    debug: 4, 
    silly: 5 
  };

  const logger = createLogger({

    level: 'debug',
    format: format.combine(
    format.colorize(),
    format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
  ),

    transports: [
      new transports.Console(),
      new transports.File({ filename: 'errorMessage.log', level: 'error' }),
      new transports.File({ filename: 'Message.log' })
    ]
  });

  module.exports = logger;