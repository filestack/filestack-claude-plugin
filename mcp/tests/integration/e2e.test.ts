const INTEGRATION = process.env.FILESTACK_INTEGRATION === '1';
const describeIf = INTEGRATION ? describe : describe.skip;

describeIf('integration: full upload → transform → sign → delete flow', () => {
  let uploadedHandle: string;

  beforeAll(() => {
    if (!process.env.FILESTACK_API_KEY || !process.env.FILESTACK_APP_SECRET) {
      throw new Error('Set FILESTACK_API_KEY and FILESTACK_APP_SECRET for integration tests');
    }
  });

  it('stores a URL and returns a handle', async () => {
    const { filestackStoreUrl } = await import('../../src/tools/files');
    const result = await filestackStoreUrl('https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Culinary_fruits_front_view.jpg/640px-Culinary_fruits_front_view.jpg');
    expect(result.error).toBeNull();
    uploadedHandle = (result.result as { handle: string }).handle;
    expect(uploadedHandle).toBeTruthy();
  });

  it('retrieves metadata for the uploaded file', async () => {
    const { filestackRetrieve } = await import('../../src/tools/files');
    const result = await filestackRetrieve(uploadedHandle);
    expect(result.error).toBeNull();
    expect(result.result).toHaveProperty('filename');
  });

  it('builds a valid transform URL (pure)', async () => {
    const { filestackTransformUrl } = await import('../../src/tools/transform');
    const result = filestackTransformUrl(uploadedHandle, [
      { operation: 'resize', params: { width: 200 } },
      { operation: 'output', params: { format: 'webp' } },
    ]);
    expect(result.error).toBeNull();
    expect(result.result).toContain(uploadedHandle);
  });

  it('generates and signs a policy', async () => {
    const { filestackGenerateSignedUrl } = await import('../../src/tools/security');
    const expiry = Math.floor(Date.now() / 1000) + 3600;
    const result = filestackGenerateSignedUrl(uploadedHandle, { call: 'read', expiry });
    expect(result.error).toBeNull();
    expect((result.result as { signedUrl: string }).signedUrl).toMatch(/security=policy:[^,]+,signature:[a-f0-9]+\//);
  });

  it('deletes the uploaded file', async () => {
    const { filestackDelete } = await import('../../src/tools/files');
    const result = await filestackDelete(uploadedHandle);
    expect(result.error).toBeNull();
  });
});
