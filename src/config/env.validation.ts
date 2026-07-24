import { Joi } from '../common/validation/joi';
import type { EnvironmentVariables } from '../interfaces/config/environment-variables.interface';

const booleanSchema = Joi.boolean().truthy('true', '1').falsy('false', '0');

const environmentSchema = Joi.object<EnvironmentVariables>({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  LOG_LEVEL: Joi.string()
    .valid('fatal', 'error', 'warn', 'log', 'debug', 'verbose')
    .default('log'),
  CORS_ENABLED: booleanSchema.default(false),
  CORS_ORIGIN: Joi.string().allow('').default(''),
  API_KEY_AUTH_ENABLED: booleanSchema.optional(),
  API_KEYS: Joi.string().allow('').optional(),
  RATE_LIMIT_TTL: Joi.number().integer().min(1).default(60),
  RATE_LIMIT_MAX: Joi.number().integer().min(1).default(100),
  BODY_SIZE_LIMIT: Joi.string()
    .pattern(/^\d+(kb|mb)$/i)
    .default('1mb'),
  TRUST_PROXY: booleanSchema.default(false),
  SWAGGER_ENABLED: booleanSchema.optional(),
  KNOWLEDGE_WEB_ALLOW_PRIVATE_NETWORK: booleanSchema.default(false),
  QDRANT_URL: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .optional(),
  QDRANT_COLLECTION: Joi.string().trim().min(1).max(255).optional(),
  OPENAI_BASE_URL: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .optional(),
  OPENAI_MODEL: Joi.string().trim().min(1).max(255).optional(),
  OPENAI_API_KEY: Joi.string().trim().min(1).max(2048).optional(),
  OPENAI_TEMPERATURE: Joi.number().min(0).max(2).default(0.7),
  EMBEDDING_BASE_URL: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .optional(),
  EMBEDDING_API_KEY: Joi.string().trim().min(1).max(2048).optional(),
  OPENAI_EMBEDDING_MODEL: Joi.string().trim().min(1).max(255).optional(),
}).unknown(true);

export function validateEnvironment(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const result = environmentSchema.validate(config, {
    abortEarly: false,
    convert: true,
  }) as unknown as {
    error?: { details: { message: string }[] };
    value: EnvironmentVariables;
  };
  const { error, value } = result;

  if (error) {
    throw new Error(
      `环境配置无效: ${error.details.map((item) => item.message).join('; ')}`,
    );
  }

  if (value.NODE_ENV === 'production') {
    if (!value.API_KEY_AUTH_ENABLED || !value.API_KEYS) {
      throw new Error('生产环境必须启用 API_KEY_AUTH_ENABLED 并配置 API_KEYS');
    }
    if (
      value.CORS_ENABLED &&
      (!value.CORS_ORIGIN || value.CORS_ORIGIN === '*')
    ) {
      throw new Error('生产环境启用 CORS 时必须配置明确的 CORS_ORIGIN 白名单');
    }

    const missingRequired = [
      ['QDRANT_URL', value.QDRANT_URL],
      ['OPENAI_MODEL', value.OPENAI_MODEL],
      ['OPENAI_API_KEY', value.OPENAI_API_KEY],
      ['OPENAI_EMBEDDING_MODEL', value.OPENAI_EMBEDDING_MODEL],
      [
        'EMBEDDING_API_KEY 或 OPENAI_API_KEY',
        value.EMBEDDING_API_KEY ?? value.OPENAI_API_KEY,
      ],
      [
        'EMBEDDING_BASE_URL 或 OPENAI_BASE_URL',
        value.EMBEDDING_BASE_URL ?? value.OPENAI_BASE_URL,
      ],
    ]
      .filter(([, setting]) => !setting)
      .map(([name]) => name);
    if (missingRequired.length > 0) {
      throw new Error(`生产环境缺少必要配置: ${missingRequired.join(', ')}`);
    }
  }

  return value;
}
