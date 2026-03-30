import { AssessedFile, DocumentRecord } from './profile-types';

export interface UploadResult {
  docs: DocumentRecord[];
  errors: string[];
}

export async function uploadDocuments(files: AssessedFile[], orgId: string): Promise<UploadResult> {
  const docs: DocumentRecord[] = [];
  const errors: string[] = [];
  for (const f of files) {
    if (f.decision !== 'extract') continue;
    try {
      const form = new FormData();
      form.append('file', f.file);
      form.append('orgId', orgId);
      const res = await fetch('/api/upload-document', { method: 'POST', body: form });
      const data = await res.json();
      if (res.ok) {
        docs.push(data);
      } else {
        errors.push(`${f.name}: ${data.error || res.statusText}`);
      }
    } catch (err) {
      errors.push(`${f.name}: ${err instanceof Error ? err.message : 'network error'}`);
    }
  }
  return { docs, errors };
}
