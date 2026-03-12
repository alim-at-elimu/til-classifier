"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { GoogleSignIn } from "@/components/google-sign-in";
import { FolderScanner } from "@/components/folder-scanner";
import { PreflightTable } from "@/components/preflight-table";
import { BatchProgressDashboard } from "@/components/batch-progress";
import { PortfolioTable } from "@/components/portfolio-table";
import { ScoreCard } from "@/components/score-card";
import { PanelistPicker } from "@/components/panelist-picker";
import { useGoogleAuth } from "@/lib/google-auth";
import { InnovatorFolder } from "@/lib/gdrive";
import { runBatch, BatchProgress } from "@/lib/batch-runner";
import { AnalyticsDashboard } from "@/components/analytics-dashboard";
import { LongitudinalView } from "@/components/longitudinal-view";
import { CountryView } from "@/components/country-view";

type Tab = "batch" | "review" | "analytics" | "longitudinal" | "country";

interface Panelist {
  id: string;
  name: string;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("batch");
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [currentPanelist, setCurrentPanelist] = useState<Panelist | null>(null);
  const [showPanelistModal, setShowPanelistModal] = useState(false);
  const [panelists, setPanelists] = useState<Panelist[]>([]);
  const [dbStatus, setDbStatus] = useState("Checking...");
  const [folders, setFolders] = useState<InnovatorFolder[] | null>(null);
  const [rootFolderId, setRootFolderId] = useState("");
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState<BatchProgress | null>(null);
  const [batchName, setBatchName] = useState("Wave 1 March 2026");
  const [runCount, setRunCount] = useState(1);
  const [resumableBatches, setResumableBatches] = useState<{ id: string; name: string; total: number; scored: number; errored: number; erroredNames: string[] }[]>([]);
  const [selectedResumeBatchId, setSelectedResumeBatchId] = useState<string | null>(null);
  const { accessToken } = useGoogleAuth();
  const runningRef = useRef(false);
  const tokenRef = useRef(accessToken);
  tokenRef.current = accessToken; // always keep ref in sync with latest token

  useEffect(() => {
    async function init() {
      const { error } = await supabase.from("batches").select("count");
      if (error) setDbStatus(`Error: ${error.message}`);
      else setDbStatus("Connected");

      const { data } = await supabase.from("panelists").select("id, name").order("name");
      if (data) setPanelists(data);

      await loadResumableBatches();
    }
    init();
  }, []);

  async function loadResumableBatches() {
    // Find batches that have proposals not yet scored
    const { data: batches } = await supabase
      .from("batches")
      .select("id, name")
      .order("created_at", { ascending: false });

    if (!batches) return;

    const resumable: typeof resumableBatches = [];
    for (const b of batches) {
      const { data: proposals } = await supabase
        .from("proposals")
        .select("id, status, org_name")
        .eq("batch_id", b.id);

      if (!proposals || proposals.length === 0) continue;

      const scored = proposals.filter((p) => p.status === "scored" || p.status === "in_review" || p.status === "finalized").length;
      const erroredProposals = proposals.filter((p) => p.status === "error" || p.status === "scoring");

      if (erroredProposals.length > 0) {
        resumable.push({ id: b.id, name: b.name, total: proposals.length, scored, errored: erroredProposals.length, erroredNames: erroredProposals.map((p) => p.org_name || "Unknown") });
      }
    }
    setResumableBatches(resumable);
  }

  useEffect(() => {
    if ((activeTab === "review" || activeTab === "longitudinal") && !currentPanelist) {
      setShowPanelistModal(true);
    }
  }, [activeTab, currentPanelist]);

  function handleSelectPanelist(p: Panelist) {
    setCurrentPanelist(p);
    setShowPanelistModal(false);
  }

  async function handleStartBatch() {
    if (!accessToken || !folders || runningRef.current) return;
    runningRef.current = true;
    setBatchRunning(true);

    try {
      for (let run = 1; run <= runCount; run++) {
        const name = runCount > 1 ? `${batchName} — Run ${run}` : batchName;
        const { data: batch, error: batchErr } = await supabase
          .from("batches")
          .insert({ name, gdrive_root_folder_id: rootFolderId, classifier_version: "v3.4", status: "scoring" })
          .select("id")
          .single();

        if (batchErr || !batch) throw new Error(batchErr?.message || "Failed to create batch");
        await runBatch(batch.id, folders, () => tokenRef.current!, (progress) => {
          setBatchProgress({ ...progress, runLabel: runCount > 1 ? `Run ${run} of ${runCount}` : undefined });
        });
      }
    } catch (err: any) {
      console.error("Batch error:", err);
    } finally {
      runningRef.current = false;
      setBatchRunning(false);
    }
  }

  async function handleResumeBatch() {
    if (!accessToken || !folders || !selectedResumeBatchId || runningRef.current) return;
    runningRef.current = true;
    setBatchRunning(true);

    try {
      await runBatch(selectedResumeBatchId, folders, () => tokenRef.current!, (progress) => {
        setBatchProgress({ ...progress });
      });
    } catch (err: any) {
      console.error("Resume batch error:", err);
    } finally {
      runningRef.current = false;
      setBatchRunning(false);
      loadResumableBatches(); // refresh the list
    }
  }

  const readyCount = folders ? folders.filter((f) => f.proposalPdf).length : 0;

  return (
    <main className="max-w-7xl mx-auto p-10 font-mono bg-white dark:bg-gray-950 text-black dark:text-gray-100 min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">TIL RFP Classifier</h1>
        {currentPanelist && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-400">Signed in as</span>
            <span className="font-semibold">{currentPanelist.name}</span>
            <button
              onClick={() => setShowPanelistModal(true)}
              className="text-xs text-gray-400 hover:text-black dark:hover:text-white underline ml-1"
            >
              switch
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-6 mb-6">
        <div className="text-sm">
          Database:{" "}
          <span className={dbStatus === "Connected" ? "text-green-600" : "text-red-600"}>{dbStatus}</span>
        </div>
        <GoogleSignIn />
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-gray-300 dark:border-gray-700 mb-6">
        <button
          onClick={() => { setActiveTab("batch"); setSelectedProposalId(null); }}
          className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === "batch" ? "border-black dark:border-white text-black dark:text-white" : "border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"}`}
        >
          Batch
        </button>
        <button
          onClick={() => { setActiveTab("review"); setSelectedProposalId(null); }}
          className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === "review" ? "border-black dark:border-white text-black dark:text-white" : "border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"}`}
        >
          Review
        </button>
        <button
          onClick={() => { setActiveTab("analytics"); setSelectedProposalId(null); }}
          className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === "analytics" ? "border-black dark:border-white text-black dark:text-white" : "border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"}`}
        >
          Analytics
        </button>
        <button
          onClick={() => { setActiveTab("longitudinal"); setSelectedProposalId(null); }}
          className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === "longitudinal" ? "border-black dark:border-white text-black dark:text-white" : "border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"}`}
        >
          Longitudinal
        </button>
        <button
          onClick={() => { setActiveTab("country"); setSelectedProposalId(null); }}
          className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === "country" ? "border-black dark:border-white text-black dark:text-white" : "border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"}`}
        >
          Country
        </button>
      </div>

      {/* Batch tab */}
      {activeTab === "batch" && (
        <>
          {accessToken && !folders && !batchProgress && (
            <FolderScanner onScanComplete={(f, id) => { setFolders(f); setRootFolderId(id); }} />
          )}
          {folders && !batchRunning && !batchProgress && (
            <>
              <PreflightTable folders={folders} />
              <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700">
                <label className="block text-sm font-medium mb-1">Batch Name</label>
                <input
                  type="text"
                  value={batchName}
                  onChange={(e) => setBatchName(e.target.value)}
                  className="rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 px-3 py-2 text-sm mb-3 w-full max-w-md"
                />
                <label className="block text-sm font-medium mb-1">Number of runs</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={runCount}
                  onChange={(e) => setRunCount(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                  className="rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 px-3 py-2 text-sm mb-3 w-24"
                />
                <div className="flex items-center gap-4">
                  <button
                    onClick={handleStartBatch}
                    disabled={readyCount === 0}
                    className="rounded bg-green-600 px-6 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    Start {runCount > 1 ? `${runCount} Runs` : "Batch"} ({readyCount} proposals each)
                  </button>
                  <button onClick={() => setFolders(null)} className="text-sm text-gray-500 underline">
                    Reset scan
                  </button>
                </div>
                {runCount > 1 && (
                  <p className="mt-2 text-xs text-gray-400">
                    Each run creates a separate batch record. You can close this tab and check results in Review when complete.
                  </p>
                )}
              </div>
            </>
          )}
          {/* Resume existing batch */}
          {folders && !batchRunning && !batchProgress && resumableBatches.length > 0 && (
            <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-950 rounded border border-amber-200 dark:border-amber-800">
              <label className="block text-sm font-medium mb-2 text-amber-800">Resume Incomplete Batch</label>
              <p className="text-xs text-amber-600 mb-3">
                These batches have proposals that errored or didn't finish scoring. Select one to re-run only the incomplete proposals.
              </p>
              <select
                value={selectedResumeBatchId || ""}
                onChange={(e) => setSelectedResumeBatchId(e.target.value || null)}
                className="rounded border border-amber-300 dark:border-amber-700 px-3 py-2 text-sm mb-3 w-full max-w-lg bg-white dark:bg-gray-800 dark:text-gray-100"
              >
                <option value="">Select a batch to resume...</option>
                {resumableBatches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} — {b.scored}/{b.total} scored, {b.errored} to retry
                  </option>
                ))}
              </select>
              {selectedResumeBatchId && (() => {
                const batch = resumableBatches.find((b) => b.id === selectedResumeBatchId);
                return (
                  <div>
                    {batch && batch.erroredNames.length > 0 && (
                      <div className="mb-3 text-xs text-amber-700 dark:text-amber-400">
                        <span className="font-semibold">To retry:</span>{" "}
                        {batch.erroredNames.join(", ")}
                      </div>
                    )}
                    <button
                      onClick={handleResumeBatch}
                      className="rounded bg-amber-600 px-6 py-2 text-sm font-medium text-white hover:bg-amber-700"
                    >
                      Resume Batch ({batch?.errored ?? 0} proposals to retry)
                    </button>
                  </div>
                );
              })()}
            </div>
          )}
          {batchProgress && <BatchProgressDashboard progress={batchProgress} />}
        </>
      )}

      {/* Review tab — portfolio */}
      {activeTab === "review" && !selectedProposalId && !showPanelistModal && (
        <PortfolioTable
          onSelectProposal={(id) => setSelectedProposalId(id)}
          panelistId={currentPanelist?.id || null}
          panelistName={currentPanelist?.name || null}
          batchId={selectedBatchId}
          onBatchChange={setSelectedBatchId}
        />
      )}

      {/* Review tab — score card */}
      {activeTab === "review" && selectedProposalId && !showPanelistModal && (
        <ScoreCard
          proposalId={selectedProposalId}
          panelistId={currentPanelist?.id || null}
          panelistName={currentPanelist?.name || null}
          onBack={() => setSelectedProposalId(null)}
        />
      )}

      {/* Longitudinal tab */}
      {activeTab === "longitudinal" && !showPanelistModal && (
        <LongitudinalView
          panelistId={currentPanelist?.id || null}
          panelistName={currentPanelist?.name || null}
          batchId={selectedBatchId}
          onBatchChange={setSelectedBatchId}
        />
      )}

      {/* Country tab */}
      {activeTab === "country" && (
        <CountryView
          batchId={selectedBatchId}
          onBatchChange={setSelectedBatchId}
        />
      )}

      {/* Analytics tab */}
      {activeTab === "analytics" && <AnalyticsDashboard />}

      {/* Panelist selection modal */}
      {showPanelistModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl p-8 max-w-sm w-full mx-4">
            <h2 className="text-lg font-bold mb-1">Who are you?</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">Select your name to track overrides.</p>
            <div className="space-y-2">
              {panelists.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleSelectPanelist(p)}
                  className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-black dark:hover:border-white hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-medium transition-colors"
                >
                  {p.name}
                </button>
              ))}
            </div>
            {currentPanelist && (
              <button
                onClick={() => setShowPanelistModal(false)}
                className="mt-4 text-xs text-gray-400 hover:text-black dark:hover:text-white w-full text-center"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}
    </main>
  );
}