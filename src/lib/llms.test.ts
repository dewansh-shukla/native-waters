import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const llmsPath = path.join(root, 'public', 'llms.txt');
const llmsFullPath = path.join(root, 'public', 'llms-full.txt');

describe('llms files', () => {
  it('exist', () => {
    expect(existsSync(llmsPath)).toBe(true);
    expect(existsSync(llmsFullPath)).toBe(true);
  });

  it('reference Native Waters', () => {
    expect(readFileSync(llmsPath, 'utf8')).toContain('Native Waters');
    expect(readFileSync(llmsFullPath, 'utf8')).toContain('Native Waters');
  });

  it('full reference includes a species and a basin', () => {
    const full = readFileSync(llmsFullPath, 'utf8');
    expect(full).toContain('Labeo rohita');
    expect(full).toContain('Cauvery');
  });

  it('full reference includes a sources section', () => {
    expect(readFileSync(llmsFullPath, 'utf8')).toContain('## Sources');
  });
});
