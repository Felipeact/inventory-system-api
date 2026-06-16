import fs from 'fs';
import os from 'os';
import path from 'path';
import { putObject } from './storage';

describe('storage (local driver)', () => {
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'storage-test-'));
  const originalCwd = process.cwd();

  beforeAll(() => {
    // STORAGE_DRIVER defaults to 'local' and UPLOAD_DIR to 'uploads' in tests.
    process.chdir(workDir);
  });

  afterAll(() => {
    process.chdir(originalCwd);
    fs.rmSync(workDir, { recursive: true, force: true });
  });

  it('writes the buffer to UPLOAD_DIR and returns a /uploads URL', async () => {
    const key = 'receipts/company-1/file.pdf';
    const result = await putObject(key, Buffer.from('hello'), 'application/pdf');

    expect(result.key).toBe(key);
    expect(result.url).toBe('/uploads/receipts/company-1/file.pdf');

    const written = fs.readFileSync(path.join(workDir, 'uploads', key), 'utf8');
    expect(written).toBe('hello');
  });

  it('creates nested directories as needed', async () => {
    const result = await putObject('receipts/c2/sub/deep.png', Buffer.from('x'), 'image/png');
    expect(fs.existsSync(path.join(workDir, 'uploads', result.key))).toBe(true);
  });
});
