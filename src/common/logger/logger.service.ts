import {
  ConsoleLogger,
  ConsoleLoggerOptions,
  Injectable,
  LogLevel,
  Scope,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const LOG_LEVELS: Record<LogLevel, number> = {
  fatal: 0,
  error: 0,
  warn: 1,
  log: 2,
  debug: 3,
  verbose: 4,
};

const ALL_LEVELS: LogLevel[] = [
  'verbose',
  'debug',
  'log',
  'warn',
  'error',
  'fatal',
];

@Injectable({ scope: Scope.TRANSIENT })
export class AppLoggerService extends ConsoleLogger {
  constructor(private readonly configService: ConfigService) {
    super(AppLoggerService.createOptions(configService));
  }

  setContext(context: string): this {
    super.setContext(context);
    return this;
  }

  private static createOptions(
    configService: ConfigService,
  ): ConsoleLoggerOptions {
    const isProduction = process.env.NODE_ENV === 'production';
    const logLevel = configService.get<string>(
      'LOG_LEVEL',
      isProduction ? 'log' : 'debug',
    );

    return {
      timestamp: true,
      colors: !isProduction,
      json: isProduction,
      logLevels: AppLoggerService.resolveLogLevels(logLevel),
    };
  }

  private static resolveLogLevels(level: string): LogLevel[] {
    const threshold = LOG_LEVELS[level as LogLevel] ?? LOG_LEVELS.log;

    return ALL_LEVELS.filter((item) => LOG_LEVELS[item] <= threshold);
  }
}
