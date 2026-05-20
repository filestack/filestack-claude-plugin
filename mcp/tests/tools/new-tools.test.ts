import nock from 'nock';
import { filestackAnalyze } from '../../src/tools/intelligence';
import { filestackZipFiles } from '../../src/tools/archive';
import { filestackScreenshotUrl } from '../../src/tools/capture';
import { filestackRunWorkflow } from '../../src/tools/workflow';
import {
  filestackVerifyWebhookSignature,
  filestackSignWebhookPayload,
} from '../../src/tools/webhook';

const TEST_KEY = 'testApiKey123';

describe('intelligence: filestackAnalyze', () => {
  const originalEnv = process.env;
  beforeEach(() => {
    process.env = { ...originalEnv, FILESTACK_API_KEY: TEST_KEY };
    nock.cleanAll();
  });
  afterEach(() => {
    process.env = originalEnv;
    nock.cleanAll();
  });

  it('runs the tags task against a handle', async () => {
    nock('https://cdn.filestackcontent.com')
      .get('/tags/abc123XYZ')
      .reply(200, { tags: { auto: { cat: 99, animal: 95 } } });
    const r = await filestackAnalyze('tags', 'abc123XYZ');
    expect(r.error).toBeNull();
    expect((r.result as { tags: unknown }).tags).toBeDefined();
  });

  it('runs sfw and returns moderation JSON', async () => {
    nock('https://cdn.filestackcontent.com')
      .get('/sfw/abc123XYZ')
      .reply(200, { sfw: true });
    const r = await filestackAnalyze('sfw', 'abc123XYZ');
    expect(r.error).toBeNull();
    expect((r.result as { sfw: boolean }).sfw).toBe(true);
  });

  it('runs doc_detection with coords:true,preprocess:true params', async () => {
    nock('https://cdn.filestackcontent.com')
      .get('/doc_detection=coords:true,preprocess:true/abc123XYZ')
      .reply(200, { detected: true, corners: [[0, 0], [100, 0], [100, 100], [0, 100]] });
    const r = await filestackAnalyze('doc_detection', 'abc123XYZ', { coords: true, preprocess: true });
    expect(r.error).toBeNull();
  });

  it('runs text_sentiment with text arg, uses apikey path segment', async () => {
    nock('https://cdn.filestackcontent.com')
      .get(`/${TEST_KEY}/text_sentiment=text:%22great%20product%22,language:en/`)
      .reply(200, { sentiment: 'positive', confidence: 0.95 });
    const r = await filestackAnalyze('text_sentiment', 'great product', { language: 'en' });
    expect(r.error).toBeNull();
  });

  it('rejects unknown task', async () => {
    const r = await filestackAnalyze('bogus_task', 'abc');
    expect(r.result).toBeNull();
    expect(r.error?.code).toBe('invalid_input');
  });
});

describe('archive: filestackZipFiles', () => {
  const originalEnv = process.env;
  beforeEach(() => { process.env = { ...originalEnv, FILESTACK_API_KEY: TEST_KEY }; });
  afterEach(() => { process.env = originalEnv; });

  it('builds a zip URL from a list of handles', () => {
    const r = filestackZipFiles(['abc123', 'def456', 'ghi789']);
    expect(r.error).toBeNull();
    expect((r.result as { url: string }).url).toBe(
      `https://cdn.filestackcontent.com/${TEST_KEY}/zip/[abc123,def456,ghi789]`,
    );
  });

  it('rejects empty array', () => {
    const r = filestackZipFiles([]);
    expect(r.result).toBeNull();
    expect(r.error?.code).toBe('invalid_input');
  });

  it('rejects more than 100 handles', () => {
    const handles = Array.from({ length: 101 }, (_, i) => `h${i}`);
    const r = filestackZipFiles(handles);
    expect(r.result).toBeNull();
    expect(r.error?.code).toBe('invalid_input');
  });

  it('rejects malformed handle', () => {
    const r = filestackZipFiles(['abc123', 'has spaces and slashes/']);
    expect(r.result).toBeNull();
  });
});

describe('capture: filestackScreenshotUrl', () => {
  const originalEnv = process.env;
  beforeEach(() => { process.env = { ...originalEnv, FILESTACK_API_KEY: TEST_KEY }; });
  afterEach(() => { process.env = originalEnv; });

  it('builds a screenshot URL with default params', () => {
    const r = filestackScreenshotUrl('https://example.com');
    expect(r.error).toBeNull();
    expect((r.result as { url: string }).url).toContain('urlscreenshot');
    expect((r.result as { url: string }).url).toContain(encodeURIComponent('https://example.com'));
  });

  it('emits explicit options as comma-separated params', () => {
    const r = filestackScreenshotUrl('https://example.com', { agent: 'mobile', mode: 'all', width: 1024, height: 768 });
    const url = (r.result as { url: string }).url;
    expect(url).toContain('urlscreenshot=agent:mobile,mode:all,width:1024,height:768');
  });

  it('rejects non-http targetUrl', () => {
    const r = filestackScreenshotUrl('not-a-url');
    expect(r.result).toBeNull();
  });
});

describe('workflow: filestackRunWorkflow', () => {
  const originalEnv = process.env;
  beforeEach(() => {
    process.env = { ...originalEnv, FILESTACK_API_KEY: TEST_KEY };
    nock.cleanAll();
  });
  afterEach(() => { process.env = originalEnv; nock.cleanAll(); });

  it('runs a workflow with a handle (no security)', async () => {
    nock('https://cdn.filestackcontent.com')
      .get('/run_workflow=id:67d273c3-249c-4192-b228-9c3e1d003963/abc123XYZ')
      .reply(200, { jobid: 'job-uuid', status: 'pending' });
    const r = await filestackRunWorkflow('abc123XYZ', '67d273c3-249c-4192-b228-9c3e1d003963');
    expect(r.error).toBeNull();
  });

  it('runs a workflow with security policy chained in path', async () => {
    nock('https://cdn.filestackcontent.com')
      .get('/security=policy:P_B64,signature:SIG_HEX/run_workflow=id:67d273c3-249c-4192-b228-9c3e1d003963/abc123XYZ')
      .reply(200, { jobid: 'job-uuid' });
    const r = await filestackRunWorkflow(
      'abc123XYZ',
      '67d273c3-249c-4192-b228-9c3e1d003963',
      { policy: 'P_B64', signature: 'SIG_HEX' },
    );
    expect(r.error).toBeNull();
  });

  it('rejects malformed workflowId (not a UUID)', async () => {
    const r = await filestackRunWorkflow('abc123', 'not-a-uuid');
    expect(r.result).toBeNull();
    expect(r.error?.code).toBe('invalid_input');
  });
});

describe('webhook: signature verification', () => {
  // From a real Filestack sign formula: signature = HMAC-SHA256("{timestamp}.{body}", secret)
  const secret = 'webhook_secret_xyz';
  const body = '{"id":1,"action":"fp.upload"}';
  const timestamp = '1710000000';

  it('verifies a valid signature', () => {
    const signed = filestackSignWebhookPayload(body, secret, Number(timestamp));
    expect(signed.error).toBeNull();
    const signature = (signed.result as { 'FS-Signature': string })['FS-Signature'];

    const verified = filestackVerifyWebhookSignature(body, signature, timestamp, secret);
    expect(verified.error).toBeNull();
    expect((verified.result as { valid: boolean }).valid).toBe(true);
  });

  it('rejects an invalid signature with a constant-time compare', () => {
    const verified = filestackVerifyWebhookSignature(body, 'a'.repeat(64), timestamp, secret);
    expect(verified.error).toBeNull();
    expect((verified.result as { valid: boolean }).valid).toBe(false);
  });

  it('returns the expected signature alongside the verdict (for debugging)', () => {
    const verified = filestackVerifyWebhookSignature(body, 'wrong', timestamp, secret);
    const result = verified.result as { valid: boolean; expected: string };
    expect(result.valid).toBe(false);
    expect(result.expected).toMatch(/^[a-f0-9]{64}$/);
  });

  it('signature input is exactly "{timestamp}.{body}"', () => {
    const signed = filestackSignWebhookPayload(body, secret, Number(timestamp));
    const payload = (signed.result as { signPayload: string }).signPayload;
    expect(payload).toBe(`${timestamp}.${body}`);
  });

  it('rejects empty inputs', () => {
    expect(filestackVerifyWebhookSignature('', 'sig', 'ts', 'sec').result).toBeNull();
    expect(filestackVerifyWebhookSignature('body', '', 'ts', 'sec').result).toBeNull();
    expect(filestackVerifyWebhookSignature('body', 'sig', '', 'sec').result).toBeNull();
    expect(filestackVerifyWebhookSignature('body', 'sig', 'ts', '').result).toBeNull();
  });
});
