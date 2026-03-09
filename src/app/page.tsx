"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { GoogleSignIn } from "@/components/google-sign-in";
import { FolderScanner } from "@/components/folder-scanner";
import { PreflightTable } from "@/components/preflight-table";
import { BatchProgressDashboard } from "@/components/batch-progress";
import { useGoogleAuth } from "@/lib/google-auth";
import { InnovatorFolder } from "@/lib/gdrive";
import { runBatch, BatchProgress } from "@/lib/batch-runner";

export default function Home() {
  const [dbStatus, setDbStatus] = useState("Checking...");
  const [folders, setFolders] = useState<InnovatorFolder[] | null>(null);
  const [rootFolderId, setRootFolderId] = useState("");
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState<BatchProgress | null>(
    null
  );
  const [batchName, setBatchName] = useState("Wave 1 March 2026");
  const { accessToken } = useGoogleAuth();
  const runningRef = useRef(false);

  useEffect(() => {
    async function check() {
      const { error } = await supabase.from("batches").select("count");
      if (error) setDbStatus(`Error: ${error.message}`);
      else setDbStatus("Connected");
    }
    check();
  }, []);

  async function handleStartBatch() {
    if (!accessToken || !folders || runningRef.current) return;
    runningRef.current = true;
    setBatchRunning(true);

    try {
      const { data: batch, error: batchErr } = await supabase
        .from("batches")
        .insert({
          name: batchName,
          gdrive_root_folder_id: rootFolderId,
          classifier_version: "v3.4",
          status: "scoring",
        })
        .select("id")
        .single();

      if (batchErr || !batch) {
        throw new Error(batchErr?.message || "Failed to create batch");
      }

      await runBatch(batch.id, folders, accessToken, (progress) => {
        setBatchProgress({ ...progress });
      });
    } catch (err: any) {
      console.error("Batch error:", err);
    } finally {
      runningRef.current = false;
      setBatchRunning(false);
    }
  }

  const readyCount = folders
    ? folders.filter((f) => f.proposalPdf).length
    : 0;

  return (
    <main className="max-w-5xl mx-auto p-10 font-mono bg-white text-black min-h-screen">
      <h1 className="text-2xl font-bold mb-6">TIL RFP Classifier</h1>

      <div className="flex items-center gap-6 mb-6">
        <div className="text-sm">
          Database:{" "}
          <span
            className={
              dbStatus === "Connected" ? "text-green-600" : "text-red-600"
            }
          >
            {dbStatus}
          </span>
        </div>
        <GoogleSignIn />
      </div>

      {accessToken && !folders && !batchProgress && (
        <FolderScanner
          onScanComplete={(f, id) => {
            setFolders(f);
            setRootFolderId(id);
          }}
        />
      )}

      {folders && !batchRunning && !batchProgress && (
        <>
          <PreflightTable folders={folders} />

          <div className="mt-6 p-4 bg-gray-50 rounded border border-gray-200">
            <label className="block text-sm font-medium mb-1">
              Batch Name
            </label>
            <input
              type="text"
              value={batchName}
              onChange={(e) => setBatchName(e.target.value)}
              className="rounded border border-gray-300 px-3 py-2 text-sm mb-3 w-full max-w-md"
            />
            <div className="flex items-center gap-4">
              <button
                onClick={handleStartBatch}
                disabled={readyCount === 0}
                className="rounded bg-green-600 px-6 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                Start Batch ({readyCount} proposals)
              </button>
              <button
                onClick={() => setFolders(null)}
                className="text-sm text-gray-500 underline"
              >
                Reset scan
              </button>
            </div>
          </div>
        </>
      )}

      {batchProgress && (
        <BatchProgressDashboard progress={batchProgress} />
      )}
    </main>
  );
}