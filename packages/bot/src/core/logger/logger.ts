import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const { combine, timestamp, errors, json, printf, colorize } = winston.format;

type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'silent';

const LOG_LEVEL = (process.env.LOG_LEVEL as LogLevel) || 'info';

const jsonFormat = combine(
	timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
	errors({ stack: true }),
	json(),
);

const consoleFormat = combine(
	timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
	errors({ stack: true }),
	colorize(),
	printf(({ level, message, timestamp, stack, ...meta }) => {
		const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
		return `[${timestamp}] ${level}: ${message}${metaStr}${stack ? ` ${stack}` : ''}`;
	}),
);

const fileFormat = LOG_LEVEL === 'debug' ? consoleFormat : jsonFormat;

const transports: winston.transport[] = [
	new DailyRotateFile({
		filename: 'logs/error-%DATE%.log',
		datePattern: 'YYYY-MM-DD',
		maxFiles: '30d',
		level: 'error',
		format: jsonFormat,
	}),
];

if (LOG_LEVEL !== 'silent') {
	transports.push(
		new DailyRotateFile({
			filename: 'logs/combined-%DATE%.log',
			datePattern: 'YYYY-MM-DD',
			maxFiles: '14d',
			maxSize: '10m',
			format: fileFormat,
		}),
	);

	if (process.env.NODE_ENV !== 'production') {
		transports.push(
			new winston.transports.Console({
				format: consoleFormat,
			}),
		);
	}
}

const logger = winston.createLogger({
	level: LOG_LEVEL,
	format: jsonFormat,
	transports,
	defaultMeta: {
		service: 'athanasius-bot',
	},
});

export default logger;
export {
	LOG_LEVEL,
};
