import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const { format, transports } = winston;
const { combine, timestamp, errors, simple, printf, colorize } = format;

export default winston.createLogger({
	level: 'error',
	format: combine(
		timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
		errors({ stack: true }),
		simple(),
	),
	transports: [
		new DailyRotateFile({
			filename: '.logs/error-%DATE%.log',
			datePattern: 'YYYY-MM-DD',
			maxFiles: '30d',
		}),
		// ! dev only
		new transports.Console({
			format: combine(
				colorize(),
				printf(({ level, message, timestamp, stack }) => {
					return `[${timestamp}] ${level}: ${message} ${stack || ''}`;
				}),
			),
		}),
	],
});
