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


type Tab = "batch" | "review" | "analytics";

interface Panelist {
  id: string;
  name: string;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("batch");
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null);
  const [currentPanelist, setCurrentPanelist] = useState<Panelist | null>(null);
  const [showPanelistModal, setShowPanelistModal] = useState(false);
  const [panelists, setPanelists] = useState<Panelist[]>([]);
  const [dbStatus, setDbStatus] = useState("Checking...");
  const [folders, setFolders] = useState<InnovatorFolder[] | null>(null);
  const [rootFolderId, setRootFolderId] = useState("");
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState<BatchProgress | null>(null);
  const [batchName, setBatchName] = useState("Wave 1 March 2026");
  const { accessToken } = useGoogleAuth();
  const runningRef = useRef(false);

  useEffect(() => {
    async function init() {
      const { error } = await supabase.from("batches").select("count");
      if (error) setDbStatus(`Error: ${error.message}`);
      else setDbStatus("Connected");

      const { data } = await supabase.from("panelists").select("id, name").order("name");
      if (data) setPanelists(data);
    }
    init();
  }, []);

  useEffect(() => {
    if (activeTab === "review" && !currentPanelist) {
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
      const { data: batch, error: batchErr } = await supabase
        .from("batches")
        .insert({ name: batchName, gdrive_root_folder_id: rootFolderId, classifier_version: "v3.4", status: "scoring" })
        .select("id")
        .single();

      if (batchErr || !batch) throw new Error(batchErr?.message || "Failed to create batch");
      await runBatch(batch.id, folders, accessToken, (progress) => { setBatchProgress({ ...progress }); });
    } catch (err: any) {
      console.error("Batch error:", err);
    } finally {
      runningRef.current = false;
      setBatchRunning(false);
    }
  }

  const readyCount = folders ? folders.filter((f) => f.proposalPdf).length : 0;

  return (
    <main className="max-w-5xl mx-auto p-10 font-mono bg-white text-black min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">TIL RFP Classifier</h1>
        {currentPanelist && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-400">Signed in as</span>
            <span className="font-semibold">{currentPanelist.name}</span>
            <button
              onClick={() => setShowPanelistModal(true)}
              className="text-xs text-gray-400 hover:text-black underline ml-1"
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
      <div className="flex border-b border-gray-300 mb-6">
        <button
          onClick={() => { setActiveTab("batch"); setSelectedProposalId(null); }}
          className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === "batch" ? "border-black text-black" : "border-transparent text-gray-400 hover:text-gray-600"}`}
        >
          Batch
        </button>
        <button
          onClick={() => { setActiveTab("review"); setSelectedProposalId(null); }}
          className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === "review" ? "border-black text-black" : "border-transparent text-gray-400 hover:text-gray-600"}`}
        >
          Review
        </button>
        <button
          onClick={() => { setActiveTab("analytics"); setSelectedProposalId(null); }}
          className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === "analytics" ? "border-black text-black" : "border-transparent text-gray-400 hover:text-gray-600"}`}
        >
          Analytics
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
              <div className="mt-6 p-4 bg-gray-50 rounded border border-gray-200">
                <label className="block text-sm font-medium mb-1">Batch Name</label>
                <input type="text" value={batchName} onChange={(e) => setBatchName(e.target.value)} className="rounded border border-gray-300 px-3 py-2 text-sm mb-3 w-full max-w-md" />
                <div className="flex items-center gap-4">
                  <button onClick={handleStartBatch} disabled={readyCount === 0} className="rounded bg-green-600 px-6 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50">
                    Start Batch ({readyCount} proposals)
                  </button>
                  <button onClick={() => setFolders(null)} className="text-sm text-gray-500 underline">Reset scan</button>
                </div>
              </div>
            </>
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

      {/* Analytics tab — placeholder */}
      {activeTab === "analytics" && <AnalyticsDashboard />}

      {/* Panelist selection modal */}
      {showPanelistModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-8 max-w-sm w-full mx-4">
            <h2 className="text-lg font-bold mb-1">Who are you?</h2>
            <p className="text-sm text-gray-500 mb-5">Select your name to track overrides.</p>
            <div className="space-y-2">
              {panelists.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleSelectPanelist(p)}
                  className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:border-black hover:bg-gray-50 text-sm font-medium transition-colors"
                >
                  {p.name}
                </button>
              ))}
            </div>
            {currentPanelist && (
              <button
                onClick={() => setShowPanelistModal(false)}
                className="mt-4 text-xs text-gray-400 hover:text-black w-full text-center"
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