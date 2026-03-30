import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseConfig, getServiceRoleKey } from '@/lib/supabase-config';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get('file') as File | null;
    const orgId = form.get('orgId') as string | null;

    if (!file || !orgId) {
      return NextResponse.json({ error: 'Missing file or orgId' }, { status: 400 });
    }

    const { url, key: anonKey } = getSupabaseConfig();
    const serviceKey = getServiceRoleKey();
    const key = serviceKey || anonKey;
    console.log('[upload-document] using key type:', serviceKey ? 'service_role' : 'anon');
    console.log('[upload-document] supabase url:', url.slice(0, 40));
    const path = `${orgId}/${Date.now()}_${file.name}`;
    const arrayBuffer = await file.arrayBuffer();

    const res = await fetch(
      `${url}/storage/v1/object/innovation-documents/${path}`,
      {
        method: 'POST',
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          'Content-Type': file.type || 'application/octet-stream',
          'x-upsert': 'true',
        },
        body: arrayBuffer,
      }
    );

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: text }, { status: res.status });
    }

    return NextResponse.json({
      name: file.name,
      path,
      type: file.name.endsWith('.pdf') ? 'pdf' : file.name.endsWith('.xlsx') ? 'xlsx' : 'unknown',
      size: file.size,
      uploaded_at: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Upload failed' }, { status: 500 });
  }
}
