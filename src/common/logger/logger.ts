import path from 'path';
import * as winston from 'winston';
import WinstonDaily from 'winston-daily-rotate-file';

import config from '@/common/config';
import jSONUtils from '../utils/JSONUtils';

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
  trace: 5,
};
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
  trace: 'black',
};

class WinstonLogger {
  private _prodTransports: WinstonDaily;
  private _localTransports: winston.transports.ConsoleTransportInstance;
  private _loggerWinston: winston.Logger;
  private _logFormat: winston.Logform.Format;

  constructor() {
    winston.addColors(colors);
    this._logFormat = winston.format.combine(
      winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss',
      }),
      winston.format.colorize({ all: true }),
      winston.format.printf(({ timestamp, level, message }) => {
        return `[${timestamp}] [${level}]: ${jSONUtils._stringify(message)}`;
      })
    );
    this._prodTransports = new WinstonDaily({
      datePattern: 'YYYY-MM-DD',
      dirname: path.join(__dirname, '..', '..', '..', 'logs'),
      filename: `%DATE%.log`,
      maxFiles: 30,
      handleExceptions: true,
      json: false,
      zippedArchive: true,
      utc: true,
    });

    this._localTransports = new winston.transports.Console();

    this._loggerWinston = winston.createLogger({
      format: this._logFormat,
      transports: [
        config.isProduction ? this._prodTransports : this._localTransports,
      ],
      levels,
    });
  }

  trace(msg: any) {
    this._loggerWinston.log('trace', msg);
  }

  debug(msg: any) {
    this._loggerWinston.debug(msg);
  }

  info(msg: any) {
    this._loggerWinston.info(msg);
  }

  warn(msg: any) {
    this._loggerWinston.warn(msg);
  }

  error(msg: any) {
    this._loggerWinston.error(msg);
  }

  fatal(msg: any) {
    this._loggerWinston.log('fatal', msg);
  }

  http(msg: any) {
    this._loggerWinston.log('http', msg);
  }
}

export default new WinstonLogger();
