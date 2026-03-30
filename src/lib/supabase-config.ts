import { readFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';

let cached: { url: string; key: string } | null = null;

export function getSupabaseConfig(): { url: string; key: string } {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && key) {
    cached = { url, key };
    return cached;
  }

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
      const urlMatch = content.match(/^NEXT_PUBLIC_SUPABASE_URL=(.+)$/m);
      const keyMatch = content.match(/^NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)$/m);
      if (urlMatch && keyMatch) {
        cached = {
          url: urlMatch[1].trim().replace(/\r$/, ''),
          key: keyMatch[1].trim().replace(/\r$/, ''),
        };
        return cached;
      }
    } catch {
      // continue
    }
  }

  throw new Error('Supabase configuration missing');
}

/** Returns the service role key, reading from env or .env.local directly */
export function getServiceRoleKey(): string | null {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) return process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (process.env.SUPABASE_SERVICE_ROLE) return process.env.SUPABASE_SERVICE_ROLE;

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
      const match = content.match(/^SUPABASE_SERVICE_ROLE(?:_KEY)?=(.+)$/m);
      if (match) return match[1].trim().replace(/\r$/, '');
    } catch { /* continue */ }
  }
  return null;
}

/** Helper for Supabase REST requests */
export function supabaseHeaders(key: string) {
  return {
    'Content-Type': 'application/json',
    apikey: key,
    Authorization: `Bearer ${key}`,
  };
}
