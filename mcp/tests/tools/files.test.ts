import nock from 'nock';
import { filestackRetrieve, filestackDelete, filestackStoreUrl } from '../../src/tools/files';

const TEST_KEY = 'testApiKey123';
const TEST_HANDLE = 'abc123XYZ';

describe('file tools', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, FILESTACK_API_KEY: TEST_KEY };
    nock.cleanAll();
  });

  afterEach(() => {
    process.env = originalEnv;
    nock.cleanAll();
  });

  describe('filestackRetrieve', () => {
    it('returns file metadata on success', async () => {
      const metadata = { filename: 'test.jpg', size: 1024, type: 'image/jpeg' };
      nock('https://www.filestackapi.com')
        .get(`/api/file/${TEST_HANDLE}/metadata`)
        .query({ key: TEST_KEY })
        .reply(200, metadata);

      const result = await filestackRetrieve(TEST_HANDLE);
      expect(result.error).toBeNull();
      expect(result.result).toMatchObject(metadata);
    });

    it('returns auth error when FILESTACK_API_KEY is missing', async () => {
      delete process.env.FILESTACK_API_KEY;
      const result = await filestackRetrieve(TEST_HANDLE);
      expect(result.result).toBeNull();
      expect(result.error?.code).toBe('auth_required');
    });

    it('returns error on 404', async () => {
      nock('https://www.filestackapi.com')
        .get(`/api/file/${TEST_HANDLE}/metadata`)
        .query({ key: TEST_KEY })
        .reply(404, 'Not Found');

      const result = await filestackRetrieve(TEST_HANDLE);
      expect(result.result).toBeNull();
      expect(result.error?.code).toBe(404);
    });

    it('returns error on 401', async () => {
      nock('https://www.filestackapi.com')
        .get(`/api/file/${TEST_HANDLE}/metadata`)
        .query({ key: TEST_KEY })
        .reply(401, 'Unauthorized');

      const result = await filestackRetrieve(TEST_HANDLE);
      expect(result.result).toBeNull();
      expect(result.error?.code).toBe(401);
    });
  });

  describe('filestackDelete', () => {
    it('returns ok on success', async () => {
      nock('https://www.filestackapi.com')
        .delete(`/api/file/${TEST_HANDLE}`)
        .query({ key: TEST_KEY })
        .reply(200, '');

      const result = await filestackDelete(TEST_HANDLE);
      expect(result.error).toBeNull();
      expect((result.result as { status: string })?.status).toBe('ok');
    });

    it('appends policy and signature when provided', async () => {
      nock('https://www.filestackapi.com')
        .delete(`/api/file/${TEST_HANDLE}`)
        .query({ key: TEST_KEY, policy: 'mypolicy', signature: 'mysig' })
        .reply(200, '');

      const result = await filestackDelete(TEST_HANDLE, 'mypolicy', 'mysig');
      expect(result.error).toBeNull();
    });

    it('returns error on 403', async () => {
      nock('https://www.filestackapi.com')
        .delete(`/api/file/${TEST_HANDLE}`)
        .query({ key: TEST_KEY })
        .reply(403, 'Policy required');

      const result = await filestackDelete(TEST_HANDLE);
      expect(result.result).toBeNull();
      expect(result.error?.code).toBe(403);
    });
  });

  describe('filestackStoreUrl', () => {
    it('stores a URL and returns handle', async () => {
      const fileResult = { handle: 'newHandle', url: 'https://cdn.filestackcontent.com/newHandle', filename: 'image.jpg' };
      nock('https://www.filestackapi.com')
        .post('/api/store/S3')
        .query({ key: TEST_KEY })
        .reply(200, fileResult);

      const result = await filestackStoreUrl('https://example.com/image.jpg');
      expect(result.error).toBeNull();
      expect((result.result as { handle: string })?.handle).toBe('newHandle');
    });

    it('returns auth error when FILESTACK_API_KEY is missing', async () => {
      delete process.env.FILESTACK_API_KEY;
      const result = await filestackStoreUrl('https://example.com/image.jpg');
      expect(result.result).toBeNull();
      expect(result.error?.code).toBe('auth_required');
    });
  });
});
