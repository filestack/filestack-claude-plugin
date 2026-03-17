import { getCredentials, hasApiKey, hasAppSecret } from '../src/auth';

describe('auth', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.FILESTACK_API_KEY;
    delete process.env.FILESTACK_APP_SECRET;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('hasApiKey', () => {
    it('returns false when FILESTACK_API_KEY is not set', () => {
      expect(hasApiKey()).toBe(false);
    });

    it('returns true when FILESTACK_API_KEY is set', () => {
      process.env.FILESTACK_API_KEY = 'test_key';
      expect(hasApiKey()).toBe(true);
    });
  });

  describe('hasAppSecret', () => {
    it('returns false when FILESTACK_APP_SECRET is not set', () => {
      expect(hasAppSecret()).toBe(false);
    });

    it('returns true when FILESTACK_APP_SECRET is set', () => {
      process.env.FILESTACK_APP_SECRET = 'test_secret';
      expect(hasAppSecret()).toBe(true);
    });
  });

  describe('getCredentials', () => {
    it('returns empty apiKey and null appSecret when env vars not set', () => {
      const creds = getCredentials();
      expect(creds.apiKey).toBe('');
      expect(creds.appSecret).toBeNull();
    });

    it('returns correct values when env vars are set', () => {
      process.env.FILESTACK_API_KEY = 'AKfoo';
      process.env.FILESTACK_APP_SECRET = 'secret';
      const creds = getCredentials();
      expect(creds.apiKey).toBe('AKfoo');
      expect(creds.appSecret).toBe('secret');
    });
  });
});
