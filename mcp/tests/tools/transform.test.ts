import nock from 'nock';
import { filestackTransformUrl, filestackTransformApply, filestackListTransforms } from '../../src/tools/transform';
import { PLACEHOLDER_API_KEY } from '../../src/auth';

const TEST_KEY = 'testApiKey123';

describe('transform tools', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, FILESTACK_API_KEY: TEST_KEY };
    nock.cleanAll();
  });

  afterEach(() => {
    process.env = originalEnv;
    nock.cleanAll();
  });

  describe('filestackTransformUrl (pure function)', () => {
    it('builds a resize URL', () => {
      const result = filestackTransformUrl('abc123', [{ operation: 'resize', params: { width: 800, height: 600 } }]);
      expect(result.error).toBeNull();
      expect(result.result).toBe('https://cdn.filestackcontent.com/resize=width:800,height:600/abc123');
    });

    it('builds a multi-transform URL', () => {
      const result = filestackTransformUrl('abc123', [
        { operation: 'resize', params: { width: 400 } },
        { operation: 'output', params: { format: 'webp' } },
      ]);
      expect(result.error).toBeNull();
      expect(result.result).toBe('https://cdn.filestackcontent.com/resize=width:400/output=format:webp/abc123');
    });

    it('builds URL with no-param operation', () => {
      const result = filestackTransformUrl('abc123', [{ operation: 'enhance' }]);
      expect(result.error).toBeNull();
      expect(result.result).toBe('https://cdn.filestackcontent.com/enhance/abc123');
    });

    it('extracts handle from full CDN URL', () => {
      const result = filestackTransformUrl(
        'https://cdn.filestackcontent.com/abc123',
        [{ operation: 'monochrome' }]
      );
      expect(result.error).toBeNull();
      expect(result.result).toBe('https://cdn.filestackcontent.com/monochrome/abc123');
    });

    it('returns error for empty handle', () => {
      const result = filestackTransformUrl('', [{ operation: 'resize' }]);
      expect(result.result).toBeNull();
      expect(result.error?.code).toBe('invalid_input');
    });

    it('builds chain: crop_faces + enhance + output', () => {
      const result = filestackTransformUrl('xyz789', [
        { operation: 'crop_faces', params: { faces: 1 } },
        { operation: 'enhance' },
        { operation: 'output', params: { format: 'jpg', quality: 85 } },
      ]);
      expect(result.error).toBeNull();
      expect(result.result).toBe('https://cdn.filestackcontent.com/crop_faces=faces:1/enhance/output=format:jpg,quality:85/xyz789');
    });
  });

  describe('filestackListTransforms', () => {
    it('returns an array of transform operations', () => {
      const result = filestackListTransforms();
      expect(result.error).toBeNull();
      expect(Array.isArray(result.result)).toBe(true);
      expect((result.result as unknown[]).length).toBeGreaterThan(0);
    });

    it('each transform has a name and description', () => {
      const result = filestackListTransforms();
      const transforms = result.result as Array<{ name: string; description: string }>;
      transforms.forEach(t => {
        expect(typeof t.name).toBe('string');
        expect(typeof t.description).toBe('string');
      });
    });
  });

  describe('filestackTransformApply', () => {
    it('GETs process API and returns new handle', async () => {
      nock('https://process.filestackapi.com')
        .get(/testApiKey123\/resize=width:800\/store\/abc123/)
        .reply(200, { handle: 'newHandle', url: 'https://cdn.filestackcontent.com/newHandle' });

      const result = await filestackTransformApply('abc123', [{ operation: 'resize', params: { width: 800 } }]);
      expect(result.error).toBeNull();
      expect((result.result as { handle: string })?.handle).toBe('newHandle');
    });

    it('falls back to placeholder key when FILESTACK_API_KEY is not set', async () => {
      delete process.env.FILESTACK_API_KEY;
      nock('https://process.filestackapi.com')
        .get(new RegExp(`${PLACEHOLDER_API_KEY}\\/resize\\/store\\/abc123`))
        .reply(200, { handle: 'newHandle', url: 'https://cdn.filestackcontent.com/newHandle' });

      const result = await filestackTransformApply('abc123', [{ operation: 'resize' }]);
      expect(result.error).toBeNull();
      expect((result.result as { handle: string })?.handle).toBe('newHandle');
    });
  });
});
