'use client';

import { useState, useEffect, useCallback } from 'react';
import { UploadedFile, AssessedFile } from '@/lib/profile-types';

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix
      const base64 = result.split(',')[1] || result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function readXlsxAsText(file: File): Promise<string> {
  const XLSX = await import('xlsx');
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheets: string[] = [];
  for (const name of workbook.SheetNames) {
    const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[name]);
    sheets.push(`--- Sheet: ${name} ---\n${csv}`);
  }
  return sheets.join('\n\n');
}

interface Props {
  files: UploadedFile[];
  onComplete: (files: AssessedFile[]) => void;
  onBack: () => void;
}

export default function FileAssessment({ files, onComplete, onBack }: Props) {
  const [assessed, setAssessed] = useState<AssessedFile[]>([]);
  const [processing, setProcessing] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function assess() {
      const results: AssessedFile[] = [];

      for (const f of files) {
        if (cancelled) return;

        // Over 10MB → skip
        if (f.size > MAX_SIZE) {
          results.push({
            ...f,
            recommendation: 'skip',
            reason: `File exceeds 10 MB limit (${formatSize(f.size)})`,
            decision: 'skip',
          });
          continue;
        }

        // Unsupported type
        if (f.type === 'unknown') {
          results.push({
            ...f,
            recommendation: 'skip',
            reason: 'Unsupported file format',
            decision: 'skip',
          });
          continue;
        }

        try {
          if (f.type === 'pdf') {
            const base64 = await readFileAsBase64(f.file);
            results.push({
              ...f,
              recommendation: 'extract',
              reason: 'PDF document — will be sent to Claude for extraction',
              decision: 'extract',
              base64,
            });
          } else if (f.type === 'xlsx') {
            const textContent = await readXlsxAsText(f.file);
            if (textContent.trim().length < 20) {
              results.push({
                ...f,
                recommendation: 'skip',
                reason: 'Spreadsheet contains no extractable text',
                decision: 'skip',
                textContent,
              });
            } else {
              results.push({
                ...f,
                recommendation: 'extract',
                reason: `Spreadsheet with ${textContent.length.toLocaleString()} characters of data`,
                decision: 'extract',
                textContent,
              });
            }
          }
        } catch {
          results.push({
            ...f,
            recommendation: 'skip',
            reason: 'Could not read file contents',
            decision: 'skip',
          });
        }
      }

      if (!cancelled) {
        setAssessed(results);
        setProcessing(false);
      }
    }

    assess();
    return () => {
      cancelled = true;
    };
  }, [files]);

  const toggleDecision = useCallback((id: string) => {
    setAssessed((prev) =>
      prev.map((f) =>
        f.id === id
          ? { ...f, decision: f.decision === 'extract' ? 'skip' : 'extract' }
          : f
      )
    );
  }, []);

  const extractCount = assessed.filter((f) => f.decision === 'extract').length;

  return (
    <div className="mx-auto max-w-2xl">
      <h2 className="mb-1 text-lg font-semibold text-gray-900">
        File assessment
      </h2>
      <p className="mb-6 text-sm text-gray-500">
        Review which files should be sent for extraction. Toggle any decision.
      </p>

      {processing ? (
        <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-6">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
          <p className="text-sm text-gray-600">Assessing files…</p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {assessed.map((f) => (
              <div
                key={f.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-800">
                    {f.name}
                  </p>
                  <p className="text-xs text-gray-400">{f.reason}</p>
                </div>
                <button
                  onClick={() => toggleDecision(f.id)}
                  className={`ml-4 shrink-0 rounded-full px-3 py-1 text-xs font-medium transition ${
                    f.decision === 'extract'
                      ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {f.decision === 'extract' ? 'Extract' : 'Skip'}
                </button>
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-center justify-between">
            <button
              onClick={onBack}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              ← Back
            </button>
            <div className="flex items-center gap-4">
              <span className="text-xs text-gray-400">
                {extractCount} file{extractCount !== 1 ? 's' : ''} will be
                extracted
              </span>
              <button
                onClick={() => onComplete(assessed)}
                disabled={extractCount === 0}
                className="rounded-lg bg-amber-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-40"
              >
                Run extraction →
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
