import { validateEnvironment } from './env.validation';

describe('validateEnvironment', () => {
  it('converts operational settings to typed values', () => {
    const config = validateEnvironment({
      NODE_ENV: 'test',
      CORS_ENABLED: 'true',
      API_KEY_AUTH_ENABLED: 'false',
      PORT: '3100',
    });

    expect(config.CORS_ENABLED).toBe(true);
    expect(config.API_KEY_AUTH_ENABLED).toBe(false);
    expect(config.PORT).toBe(3100);
  });

  it('rejects an incomplete production configuration', () => {
    expect(() =>
      validateEnvironment({
        NODE_ENV: 'production',
        API_KEY_AUTH_ENABLED: 'true',
        API_KEYS: 'strong-key',
      }),
    ).toThrow('生产环境缺少必要配置');
  });
});
