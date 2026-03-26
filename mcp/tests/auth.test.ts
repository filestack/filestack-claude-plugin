import { getCredentials, hasApiKey, hasAppSecret, isPlaceholderKey, PLACEHOLDER_API_KEY } from '../src/auth';

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
    it('returns true even when FILESTACK_API_KEY is not set (placeholder fallback)', () => {
      expect(hasApiKey()).toBe(true);
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

  describe('isPlaceholderKey', () => {
    it('returns true when FILESTACK_API_KEY is not set', () => {
      expect(isPlaceholderKey()).toBe(true);
    });

    it('returns true when FILESTACK_API_KEY equals the placeholder', () => {
      process.env.FILESTACK_API_KEY = PLACEHOLDER_API_KEY;
      expect(isPlaceholderKey()).toBe(true);
    });

    it('returns false when FILESTACK_API_KEY is a real key', () => {
      process.env.FILESTACK_API_KEY = 'real_key';
      expect(isPlaceholderKey()).toBe(false);
    });
  });

  describe('getCredentials', () => {
    it('returns placeholder apiKey and null appSecret when env vars not set', () => {
      const creds = getCredentials();
      expect(creds.apiKey).toBe(PLACEHOLDER_API_KEY);
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
