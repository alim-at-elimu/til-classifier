'use client';

import { useState, useRef, useCallback } from 'react';
import { UploadedFile } from '@/lib/profile-types';

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

function classifyType(file: File): UploadedFile['type'] {
  if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) return 'pdf';
  if (
    file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    file.name.endsWith('.xlsx')
  )
    return 'xlsx';
  return 'unknown';
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const TYPE_ICONS: Record<string, string> = {
  pdf: '📄',
  xlsx: '📊',
  unknown: '📎',
};

interface Props {
  onComplete: (files: UploadedFile[]) => void;
}

export default function FileUpload({ onComplete }: Props) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((fileList: FileList) => {
    const newFiles: UploadedFile[] = Array.from(fileList)
      .filter((f) => {
        const t = classifyType(f);
        return t === 'pdf' || t === 'xlsx';
      })
      .map((f) => ({
        id: generateId(),
        file: f,
        name: f.name,
        size: f.size,
        type: classifyType(f),
      }));
    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  return (
    <div className="mx-auto max-w-2xl">
      <h2 className="mb-1 text-lg font-semibold text-gray-900">
        Upload innovator files
      </h2>
      <p className="mb-6 text-sm text-gray-500">
        Upload all documents for a single innovator. Supported formats: PDF and
        XLSX.
      </p>

      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-lg border-2 border-dashed p-10 text-center transition ${
          dragActive
            ? 'border-amber-400 bg-amber-50'
            : 'border-gray-300 bg-white hover:border-amber-300'
        }`}
      >
        <div className="text-3xl">📁</div>
        <p className="mt-2 text-sm font-medium text-gray-700">
          Drop files here or click to browse
        </p>
        <p className="mt-1 text-xs text-gray-400">PDF and XLSX only</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.xlsx"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) addFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="mt-6 space-y-2">
          {files.map((f) => (
            <div
              key={f.id}
              className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">{TYPE_ICONS[f.type]}</span>
                <div>
                  <p className="text-sm font-medium text-gray-800">{f.name}</p>
                  <p className="text-xs text-gray-400">
                    {formatSize(f.size)} · {f.type.toUpperCase()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => removeFile(f.id)}
                className="text-gray-400 hover:text-red-500"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Continue */}
      {files.length > 0 && (
        <div className="mt-6 flex justify-end">
          <button
            onClick={() => onComplete(files)}
            className="rounded-lg bg-amber-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-amber-600"
          >
            Continue to assessment →
          </button>
        </div>
      )}
    </div>
  );
}
