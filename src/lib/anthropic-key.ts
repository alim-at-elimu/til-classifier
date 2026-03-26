import { readFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';

function loadAnthropicKey(): string {
  const envKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (envKey) return envKey;

  const candidates = [
    process.cwd(),
    resolve(process.cwd(), '..'),
    resolve(process.cwd(), '../..'),
    'C:/Users/ladha/til-classifier',
  ];

  for (const dir of candidates) {
    try {
      const envPath = join(dir, '.env.local');
      if (!existsSync(envPath)) continue;
      const content = readFileSync(envPath, 'utf-8');
      const match = content.match(/^ANTHROPIC_API_KEY=(.+)$/m);
      if (match) {
        const key = match[1].trim().replace(/\r$/, '');
        process.env.ANTHROPIC_API_KEY = key;
        console.log(`[profile] Loaded ANTHROPIC_API_KEY from ${envPath}`);
        return key;
      }
    } catch {
      // continue
    }
  }
  return '';
}

const CACHED_KEY = loadAnthropicKey();

export function getAnthropicKey(): string {
  const key = CACHED_KEY || process.env.ANTHROPIC_API_KEY?.trim() || '';
  if (!key) throw new Error('ANTHROPIC_API_KEY not configured');
  return key;
}
