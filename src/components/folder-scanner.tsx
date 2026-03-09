"use client";

import { useState } from "react";
import { useGoogleAuth } from "@/lib/google-auth";
import { scanRootFolder, InnovatorFolder } from "@/lib/gdrive";

interface FolderScannerProps {
  onScanComplete: (folders: InnovatorFolder[], rootFolderId: string) => void;
}

export function FolderScanner({ onScanComplete }: FolderScannerProps) {
  const { accessToken } = useGoogleAuth();
  const [folderId, setFolderId] = useState("");
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleScan() {
    if (!accessToken || !folderId.trim()) return;

    setScanning(true);
    setError(null);

    try {
      const results = await scanRootFolder(folderId.trim(), accessToken);
      if (results.length === 0) {
        setError("No sub-folders found. Check the folder ID.");
      } else {
        onScanComplete(results, folderId.trim());
      }
    } catch (err: any) {
      setError(err.message || "Scan failed");
    } finally {
      setScanning(false);
    }
  }

  return (
    <div className="mt-6">
      <label className="block text-sm font-medium mb-1">
        GDrive Root Folder ID
      </label>
      <p className="text-xs text-gray-500 mb-2">
        Open the folder in Google Drive. The ID is the last part of the URL
        after /folders/
      </p>
      <div className="flex gap-2">
        <input
          type="text"
          value={folderId}
          onChange={(e) => setFolderId(e.target.value)}
          placeholder="e.g. 1aBcD_eFgHiJkLmNoPqRsT"
          className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm"
        />
        <button
          onClick={handleScan}
          disabled={scanning || !folderId.trim()}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {scanning ? "Scanning..." : "Scan Folder"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}