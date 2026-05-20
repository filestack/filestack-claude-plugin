import { createHmac } from 'crypto';
import { filestackGeneratePolicy, filestackSignPolicy, filestackGenerateSignedUrl } from '../../src/tools/security';

const TEST_KEY = 'testApiKey123';
const TEST_SECRET = 'testAppSecret456';
const FUTURE_EXPIRY = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

describe('security tools', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      FILESTACK_API_KEY: TEST_KEY,
      FILESTACK_APP_SECRET: TEST_SECRET,
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('filestackGeneratePolicy', () => {
    // Helper to decode URL-safe base64. Filestack now emits WITH padding
    // (matches server's strict urlsafe_b64decode), so no padding restoration needed.
    function decodePolicy(policyB64: string): Record<string, unknown> {
      const standard = policyB64.replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(Buffer.from(standard, 'base64').toString('utf8'));
    }

    it('generates a URL-safe base64-encoded policy with padding for read access', () => {
      const result = filestackGeneratePolicy({ call: 'read', expiry: FUTURE_EXPIRY });
      expect(result.error).toBeNull();
      // URL-safe base64 must not contain '+' or '/'
      expect(result.result).not.toMatch(/[+/]/);
      // Padded base64 length must be a multiple of 4 (server requirement)
      expect(result.result!.length % 4).toBe(0);
      const decoded = decodePolicy(result.result!);
      expect(decoded.call).toEqual(['read']);
      expect(decoded.expiry).toBe(FUTURE_EXPIRY);
    });

    it('accepts an array of call values', () => {
      const result = filestackGeneratePolicy({ call: ['read', 'store'], expiry: FUTURE_EXPIRY });
      expect(result.error).toBeNull();
      const decoded = decodePolicy(result.result!);
      expect(decoded.call).toEqual(['read', 'store']);
    });

    it('includes optional fields when provided', () => {
      const result = filestackGeneratePolicy({
        call: 'read',
        expiry: FUTURE_EXPIRY,
        handle: 'abc123',
        container: 'my-bucket',
        maxSize: 1048576,
      });
      expect(result.error).toBeNull();
      const decoded = decodePolicy(result.result!);
      expect(decoded.handle).toBe('abc123');
      expect(decoded.container).toBe('my-bucket');
      expect(decoded.maxSize).toBe(1048576);
    });

    it('rejects invalid call values', () => {
      const result = filestackGeneratePolicy({ call: 'invalid' as 'read', expiry: FUTURE_EXPIRY });
      expect(result.result).toBeNull();
      expect(result.error?.code).toBe('invalid_input');
    });

    it('rejects past expiry', () => {
      const result = filestackGeneratePolicy({ call: 'read', expiry: 1000 }); // year 1970
      expect(result.result).toBeNull();
      expect(result.error?.code).toBe('invalid_input');
    });
  });

  describe('filestackSignPolicy', () => {
    it('produces correct HMAC-SHA256 hex signature', () => {
      // Construct a URL-safe padded base64 policy as the tool would receive it
      const raw = JSON.stringify({ call: ['read'], expiry: FUTURE_EXPIRY });
      const policyB64 = Buffer.from(raw).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');
      const result = filestackSignPolicy(policyB64);
      expect(result.error).toBeNull();

      // Verify against independent HMAC computation (signing the URL-safe b64 string)
      const expected = createHmac('sha256', TEST_SECRET).update(policyB64).digest('hex');
      expect(result.result).toBe(expected);
    });

    it('returns secret error when FILESTACK_APP_SECRET is missing', () => {
      delete process.env.FILESTACK_APP_SECRET;
      const result = filestackSignPolicy('anyPolicy');
      expect(result.result).toBeNull();
      expect(result.error?.code).toBe('auth_required');
    });
  });

  describe('filestackGenerateSignedUrl', () => {
    it('returns policy, signature, and path-based signed URL (canonical Filestack form)', () => {
      const result = filestackGenerateSignedUrl('abc123', { call: 'read', expiry: FUTURE_EXPIRY });
      expect(result.error).toBeNull();
      const r = result.result!;
      expect(r.policy).toBeTruthy();
      expect(r.signature).toBeTruthy();
      // Canonical form: cdn.filestackcontent.com/security=policy:<P>,signature:<S>/<handle>
      // See docs/content/security/policies.md, filestack-python models/security.py
      expect(r.signedUrl).toBe(
        `https://cdn.filestackcontent.com/security=policy:${r.policy},signature:${r.signature}/abc123`
      );
    });

    it('works even when FILESTACK_API_KEY is not set (CDN URLs do not require apikey for first-party handles)', () => {
      delete process.env.FILESTACK_API_KEY;
      const result = filestackGenerateSignedUrl('abc123', { call: 'read', expiry: FUTURE_EXPIRY });
      expect(result.error).toBeNull();
      const r = result.result!;
      expect(r.signedUrl).toContain('abc123');
      expect(r.signedUrl).toContain('security=policy:');
    });

    it('returns secret error when FILESTACK_APP_SECRET is missing', () => {
      delete process.env.FILESTACK_APP_SECRET;
      const result = filestackGenerateSignedUrl('abc123', { call: 'read', expiry: FUTURE_EXPIRY });
      expect(result.result).toBeNull();
      expect(result.error?.code).toBe('auth_required');
    });
  });
});
