"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { GoogleSignIn } from "@/components/google-sign-in";
import { FolderScanner } from "@/components/folder-scanner";
import { PreflightTable } from "@/components/preflight-table";
import { BatchProgressDashboard } from "@/components/batch-progress";
import { PortfolioTable } from "@/components/portfolio-table";
import { ScoreCard } from "@/components/score-card";
import { useGoogleAuth } from "@/lib/google-auth";
import { InnovatorFolder } from "@/lib/gdrive";
import { runBatch, BatchProgress } from "@/lib/batch-runner";
import { AnalyticsDashboard } from "@/components/analytics-dashboard";
import { LongitudinalView } from "@/components/longitudinal-view";
import { CountryView } from "@/components/country-view";
import { ShortlistSelector } from "@/components/shortlist-selector";
import { ShortlistReviewCard } from "@/components/shortlist-review-card";
import { runShortlistReview, loadShortlistReviews } from "@/lib/shortlist-runner";
import type { ShortlistProgress, ShortlistReviewResult } from "@/lib/shortlist-runner";

type Tab = "batch" | "review" | "analytics" | "longitudinal" | "country" | "shortlist";

function ShortlistTab({ batchId, onBatchChange, accessToken, tokenRef }: {
  batchId: string | null;
  onBatchChange: (id: string | null) => void;
  accessToken: string | null;
  tokenRef: React.RefObject<string | null>;
}) {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<ShortlistProgress | null>(null);
  const [results, setResults] = useState<ShortlistReviewResult[]>([]);
  const [loadingPast, setLoadingPast] = useState(false);

  // Load past reviews when batch changes
  useEffect(() => {
    if (!batchId) return;
    let cancelled = false;
    setLoadingPast(true);
    loadShortlistReviews(batchId).then((past) => {
      if (!cancelled) {
        setResults(past);
        setLoadingPast(false);
      }
    }).catch(() => {
      if (!cancelled) setLoadingPast(false);
    });
    return () => { cancelled = true; };
  }, [batchId]);

  async function handleRunReview(ids: string[]) {
    if (!accessToken) {
      alert("Please sign in with Google first to access proposal documents.");
      return;
    }
    setRunning(true);
    try {
      const newResults = await runShortlistReview(
        ids,
        () => tokenRef.current!,
        (p) => setProgress({ ...p })
      );
      // Open each result in a new browser tab
      for (const r of newResults) {
        window.open(`/shortlist/${r.reviewId}`, "_blank");
      }
      // Also merge into local state so selector shows updated status
      setResults((prev) => {
        const updated = new Map(prev.map((r) => [r.proposalId, r]));
        for (const r of newResults) updated.set(r.proposalId, r);
        return Array.from(updated.values());
      });
    } catch (err) {
      console.error("Shortlist review error:", err);
    } finally {
      setRunning(false);
      setProgress(null);
    }
  }

  return (
    <>
      <ShortlistSelector
        batchId={batchId}
        onBatchChange={onBatchChange}
        onRunReview={handleRunReview}
        disabled={running || !accessToken}
      />

      {running && progress && (
        <div className="py-6">
          <div className="text-sm font-medium mb-2">
            {progress.phase === "downloading" && `Downloading PDF: ${progress.current}`}
            {progress.phase === "reviewing" && `Reviewing: ${progress.current}`}
            {progress.phase === "saving" && `Saving: ${progress.current}`}
            {progress.phase === "done" && "Complete"}
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all"
              style={{ width: `${Math.round((progress.completed / progress.total) * 100)}%` }}
            />
          </div>
          <div className="text-xs text-gray-500">
            {progress.completed} / {progress.total} proposals
          </div>
          {progress.errors.length > 0 && (
            <div className="mt-3 text-xs text-red-600 dark:text-red-400">
              {progress.errors.length} error{progress.errors.length !== 1 ? "s" : ""}:{" "}
              {progress.errors.map((e) => e.name).join(", ")}
            </div>
          )}
        </div>
      )}

      {loadingPast && (
        <div className="text-sm text-gray-400 py-4">Loading past reviews...</div>
      )}

      {!loadingPast && results.length > 0 && (
        <div className="mt-4">
          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
            {results.length} review{results.length !== 1 ? "s" : ""}
          </div>
          {results.map((r) => (
            <ShortlistReviewCard
              key={r.proposalId}
              proposalId={r.proposalId}
              orgName={r.orgName}
              country={r.country}
              totalScore={r.totalScore}
              modelUsed={r.modelUsed}
              review={r.review as never}
            />
          ))}
        </div>
      )}
    </>
  );
}

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
  const [selectedFolderIds, setSelectedFolderIds] = useState<Set<string>>(new Set());
  const [matchedBatch, setMatchedBatch] = useState<{ id: string; name: string; scored: number; errored: number; newCount: number } | null>(null);
  const [allBatches, setAllBatches] = useState<{ id: string; name: string }[]>([]);
  const [addToBatchId, setAddToBatchId] = useState<string | null>(null);
  const { accessToken } = useGoogleAuth();
  const runningRef = useRef(false);
  const tokenRef = useRef(accessToken);
  tokenRef.current = accessToken; // always keep ref in sync with latest token

  const loadResumableBatches = useCallback(async () => {
    // Find batches that have proposals not yet scored
    const { data: batches } = await supabase
      .from("batches")
      .select("id, name")
      .order("created_at", { ascending: false });

    if (!batches) return;

    const resumable: { id: string; name: string; total: number; scored: number; errored: number; erroredNames: string[] }[] = [];
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
  }, []);

  useEffect(() => {
    async function init() {
      const { error } = await supabase.from("batches").select("count");
      if (error) setDbStatus(`Error: ${error.message}`);
      else setDbStatus("Connected");

      const { data } = await supabase.from("panelists").select("id, name").order("name");
      if (data) setPanelists(data);

      // Load all batches for the dropdown
      const { data: batchList } = await supabase.from("batches").select("id, name").order("created_at", { ascending: false });
      if (batchList) setAllBatches(batchList);

      await loadResumableBatches();
    }
    init();
  }, [loadResumableBatches]);

  // Auto-detect matching batch and set default selections when folders are scanned
  useEffect(() => {
    if (!folders || folders.length === 0) return;
    const foldersSnapshot = folders; // narrow for async closure

    async function detectBatch() {
      // Find batches that used this same root folder
      const { data: matches } = await supabase
        .from("batches")
        .select("id, name")
        .eq("gdrive_root_folder_id", rootFolderId)
        .order("created_at", { ascending: false })
        .limit(1);

      if (matches && matches.length > 0) {
        const batch = matches[0];
        // Count proposals in this batch
        const { data: proposals } = await supabase
          .from("proposals")
          .select("gdrive_folder_id, status")
          .eq("batch_id", batch.id);

        const scoredFolders = new Set<string>();
        const erroredFolders = new Set<string>();
        if (proposals) {
          for (const p of proposals) {
            if (p.status === "scored" || p.status === "in_review" || p.status === "finalized") {
              scoredFolders.add(p.gdrive_folder_id);
            } else if (p.status === "error") {
              erroredFolders.add(p.gdrive_folder_id);
            }
          }
        }

        const newFolders = foldersSnapshot.filter(
          (f) => f.proposalPdf && !scoredFolders.has(f.folderId) && !erroredFolders.has(f.folderId)
        );

        setMatchedBatch({
          id: batch.id,
          name: batch.name,
          scored: scoredFolders.size,
          errored: erroredFolders.size,
          newCount: newFolders.length,
        });
        setAddToBatchId(batch.id);

        // Default selection: new + errored checked, scored unchecked
        const defaultSelected = new Set<string>();
        for (const f of foldersSnapshot) {
          if (!f.proposalPdf) continue;
          if (scoredFolders.has(f.folderId)) continue; // skip already scored
          defaultSelected.add(f.folderId);
        }
        setSelectedFolderIds(defaultSelected);
      } else {
        setMatchedBatch(null);
        setAddToBatchId(null);
        // No matching batch — select all ready folders
        const allReady = new Set(foldersSnapshot.filter((f) => f.proposalPdf).map((f) => f.folderId));
        setSelectedFolderIds(allReady);
      }
    }
    detectBatch();
  }, [folders, rootFolderId]);

  useEffect(() => {
    if ((activeTab === "review" || activeTab === "longitudinal") && !currentPanelist) {
      setShowPanelistModal(true);
    }
  }, [activeTab, currentPanelist]);

  function handleSelectPanelist(p: Panelist) {
    setCurrentPanelist(p);
    setShowPanelistModal(false);
  }

  async function handleStartBatch(useExistingBatchId?: string) {
    if (!accessToken || !folders || runningRef.current) return;
    if (selectedFolderIds.size === 0) return;
    runningRef.current = true;
    setBatchRunning(true);

    try {
      if (useExistingBatchId) {
        // Add selected proposals to existing batch
        await runBatch(useExistingBatchId, folders, () => tokenRef.current!, (progress) => {
          setBatchProgress({ ...progress });
        }, selectedFolderIds);
      } else {
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
          }, selectedFolderIds);
        }
      }
    } catch (err: unknown) {
      console.error("Batch error:", err instanceof Error ? err.message : String(err));
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
    } catch (err: unknown) {
      console.error("Resume batch error:", err instanceof Error ? err.message : String(err));
    } finally {
      runningRef.current = false;
      setBatchRunning(false);
      loadResumableBatches(); // refresh the list
    }
  }

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
        <button
          onClick={() => { setActiveTab("shortlist"); setSelectedProposalId(null); }}
          className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === "shortlist" ? "border-black dark:border-white text-black dark:text-white" : "border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"}`}
        >
          Shortlist Review
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
              <PreflightTable
                folders={folders}
                selectedFolderIds={selectedFolderIds}
                onSelectionChange={setSelectedFolderIds}
                matchedBatch={matchedBatch}
              />
              <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700">
                {/* Add to existing batch */}
                {matchedBatch && (
                  <div className="mb-4 p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded border border-indigo-200 dark:border-indigo-800">
                    <div className="text-sm font-medium text-indigo-800 dark:text-indigo-300 mb-2">
                      Add to existing batch
                    </div>
                    <select
                      value={addToBatchId || ""}
                      onChange={(e) => setAddToBatchId(e.target.value || null)}
                      className="rounded border border-indigo-300 dark:border-indigo-700 px-3 py-2 text-sm mb-3 w-full max-w-lg bg-white dark:bg-gray-800 dark:text-gray-100"
                    >
                      <option value="">Select a batch...</option>
                      {allBatches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}{b.id === matchedBatch.id ? " (auto-detected)" : ""}
                        </option>
                      ))}
                    </select>
                    <div>
                      <button
                        onClick={() => addToBatchId && handleStartBatch(addToBatchId)}
                        disabled={selectedFolderIds.size === 0 || !addToBatchId}
                        className="rounded bg-indigo-600 px-6 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                      >
                        Add {selectedFolderIds.size} Proposal{selectedFolderIds.size !== 1 ? "s" : ""} to Batch
                      </button>
                    </div>
                  </div>
                )}

                {/* Create new batch */}
                <label className="block text-sm font-medium mb-1">
                  {matchedBatch ? "Or create a new batch" : "Batch Name"}
                </label>
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
                    onClick={() => handleStartBatch()}
                    disabled={selectedFolderIds.size === 0}
                    className="rounded bg-green-600 px-6 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    Create New Batch ({selectedFolderIds.size} proposal{selectedFolderIds.size !== 1 ? "s" : ""})
                  </button>
                  <button onClick={() => { setFolders(null); setMatchedBatch(null); setAddToBatchId(null); }} className="text-sm text-gray-500 underline">
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
                These batches have proposals that errored or didn&apos;t finish scoring. Select one to re-run only the incomplete proposals.
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

      {/* Shortlist Review tab */}
      {activeTab === "shortlist" && (
        <ShortlistTab
          batchId={selectedBatchId}
          onBatchChange={setSelectedBatchId}
          accessToken={accessToken}
          tokenRef={tokenRef}
        />
      )}

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