'use client';

import { useState, useEffect, useCallback } from 'react';
import { UploadedFile, AssessedFile } from '@/lib/profile-types';

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const LARGE_FILE = 5 * 1024 * 1024; // 5 MB — default to "store only"

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

const TYPE_ICONS: Record<string, string> = { pdf: '📄', xlsx: '📊', unknown: '📎' };

const DECISION_OPTIONS: { value: AssessedFile['decision']; label: string; subtitle: string; color: string; activeColor: string }[] = [
  { value: 'extract', label: 'Extract', subtitle: 'Process with Claude AI', color: 'bg-gray-100 text-gray-500 hover:bg-gray-200', activeColor: 'bg-emerald-100 text-emerald-700' },
  { value: 'store', label: 'Store only', subtitle: 'Save without extraction', color: 'bg-gray-100 text-gray-500 hover:bg-gray-200', activeColor: 'bg-blue-100 text-blue-700' },
  { value: 'skip', label: 'Skip', subtitle: 'Do not upload', color: 'bg-gray-100 text-gray-500 hover:bg-gray-200', activeColor: 'bg-gray-200 text-gray-600' },
];

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

        // Large files default to store-only
        const isLarge = f.size > LARGE_FILE;

        try {
          if (f.type === 'pdf') {
            const base64 = await readFileAsBase64(f.file);
            results.push({
              ...f,
              recommendation: isLarge ? 'store' : 'extract',
              reason: isLarge
                ? `Large PDF (${formatSize(f.size)}) — defaulting to store only`
                : 'PDF document — ready for Claude extraction',
              decision: isLarge ? 'store' : 'extract',
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
                recommendation: isLarge ? 'store' : 'extract',
                reason: isLarge
                  ? `Large spreadsheet (${formatSize(f.size)}) — defaulting to store only`
                  : `Spreadsheet with ${textContent.length.toLocaleString()} characters of data`,
                decision: isLarge ? 'store' : 'extract',
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

  const setDecision = useCallback((id: string, decision: AssessedFile['decision']) => {
    setAssessed((prev) =>
      prev.map((f) => (f.id === id ? { ...f, decision } : f))
    );
  }, []);

  const extractCount = assessed.filter((f) => f.decision === 'extract').length;
  const storeCount = assessed.filter((f) => f.decision === 'store').length;
  const skipCount = assessed.filter((f) => f.decision === 'skip').length;

  return (
    <div className="mx-auto max-w-2xl">
      <h2 className="mb-1 text-lg font-semibold text-gray-900">
        File assessment
      </h2>
      <p className="mb-6 text-sm text-gray-500">
        Choose how each file should be handled: extract content with Claude AI, store without extraction, or skip.
      </p>

      {processing ? (
        <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-6">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
          <p className="text-sm text-gray-600">Assessing files…</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {assessed.map((f) => (
              <div
                key={f.id}
                className="rounded-lg border border-gray-200 bg-white px-4 py-3"
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-lg">{TYPE_ICONS[f.type]}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-800">
                      {f.name}
                    </p>
                    <p className="text-xs text-gray-400">{f.reason}</p>
                  </div>
                  <span className="shrink-0 rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                    {formatSize(f.size)}
                  </span>
                </div>
                <div className="flex gap-1.5">
                  {DECISION_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setDecision(f.id, opt.value)}
                      className={`flex flex-col items-center rounded-md px-3 py-1.5 text-center transition ${
                        f.decision === opt.value ? opt.activeColor : opt.color
                      }`}
                    >
                      <span className="text-xs font-medium">{opt.label}</span>
                      <span className="text-[9px] opacity-70">{opt.subtitle}</span>
                    </button>
                  ))}
                </div>
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
                {extractCount} extract · {storeCount} store · {skipCount} skip
              </span>
              <button
                onClick={() => onComplete(assessed)}
                disabled={extractCount === 0 && storeCount === 0}
                className="rounded-lg bg-amber-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-40"
              >
                Continue →
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
