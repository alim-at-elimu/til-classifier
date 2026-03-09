"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export interface ProposalRow {
  id: string;
  org_name: string;
  country: string;
  theme: string;
  status: string;
  raw_total: number | null;
  recommendation: string | null;
  gates_passed: boolean | null;
}

type SortKey = "org_name" | "country" | "theme" | "raw_total" | "recommendation" | "gates_passed";
type SortDir = "asc" | "desc";

const BAND_STYLE: Record<string, { bg: string; text: string }> = {
  Excellent: { bg: "bg-green-100", text: "text-green-800" },
  Good: { bg: "bg-lime-100", text: "text-lime-800" },
  Weak: { bg: "bg-amber-100", text: "text-amber-800" },
  Fail: { bg: "bg-red-100", text: "text-red-800" },
};

const BAND_ORDER: Record<string, number> = { Excellent: 4, Good: 3, Weak: 2, Fail: 1 };

interface PortfolioTableProps {
  onSelectProposal: (id: string) => void;
  panelistId: string | null;
  panelistName: string | null;
}

export function PortfolioTable({ onSelectProposal, panelistId, panelistName }: PortfolioTableProps) {
  const [proposals, setProposals] = useState<ProposalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("raw_total");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [unlockConfirm, setUnlockConfirm] = useState<string | null>(null);

  useEffect(() => {
    loadProposals();
  }, []);

  async function loadProposals() {
    const { data } = await supabase
      .from("proposals")
      .select(
        "id, org_name, country, theme, status, classifier_results(raw_total, recommendation, gates_passed)"
      )
      .in("status", ["scored", "in_review", "finalized"]);

    if (data) {
      const rows: ProposalRow[] = data.map((p: any) => {
        const cr = Array.isArray(p.classifier_results)
          ? p.classifier_results[0]
          : p.classifier_results;
        return {
          id: p.id,
          org_name: p.org_name || "Unknown",
          country: p.country || "",
          theme: p.theme || "",
          status: p.status,
          raw_total: cr?.raw_total ?? null,
          recommendation: cr?.recommendation ?? null,
          gates_passed: cr?.gates_passed ?? null,
        };
      });
      setProposals(rows);
    }
    setLoading(false);
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir(key === "raw_total" ? "desc" : "asc");
    }
  }

  const sorted = [...proposals].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case "org_name":
      case "country":
      case "theme":
        cmp = (a[sortKey] || "").localeCompare(b[sortKey] || "");
        break;
      case "raw_total":
        cmp = (a.raw_total ?? 0) - (b.raw_total ?? 0);
        break;
      case "recommendation":
        cmp = (BAND_ORDER[a.recommendation || ""] ?? 0) - (BAND_ORDER[b.recommendation || ""] ?? 0);
        break;
      case "gates_passed":
        cmp = (a.gates_passed ? 1 : 0) - (b.gates_passed ? 1 : 0);
        break;
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  async function handleLock(proposalId: string) {
    await supabase.from("proposals").update({ status: "finalized" }).eq("id", proposalId);
    setProposals((prev) => prev.map((p) => (p.id === proposalId ? { ...p, status: "finalized" } : p)));
  }

  async function handleUnlock(proposalId: string) {
    await supabase.from("proposals").update({ status: "scored" }).eq("id", proposalId);
    setProposals((prev) => prev.map((p) => (p.id === proposalId ? { ...p, status: "scored" } : p)));
    setUnlockConfirm(null);
  }

  function SortHeader({ label, sortKeyName }: { label: string; sortKeyName: SortKey }) {
    const active = sortKey === sortKeyName;
    return (
      <th
        className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-black select-none"
        onClick={() => handleSort(sortKeyName)}
      >
        {label} {active ? (sortDir === "asc" ? "↑" : "↓") : ""}
      </th>
    );
  }

  if (loading) return <div className="text-sm text-gray-500">Loading proposals...</div>;
  if (proposals.length === 0) return <div className="text-sm text-gray-500">No scored proposals found. Run a batch first.</div>;

  return (
    <div>
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <SortHeader label="Organisation" sortKeyName="org_name" />
              <SortHeader label="Country" sortKeyName="country" />
              <SortHeader label="Theme" sortKeyName="theme" />
              <SortHeader label="Score" sortKeyName="raw_total" />
              <SortHeader label="Band" sortKeyName="recommendation" />
              <SortHeader label="Gates" sortKeyName="gates_passed" />
              <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider w-20">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sorted.map((p) => {
              const band = BAND_STYLE[p.recommendation || ""] || { bg: "bg-gray-100", text: "text-gray-600" };
              const isLocked = p.status === "finalized";
              return (
                <tr
                  key={p.id}
                  className={`hover:bg-blue-50 cursor-pointer transition-colors ${isLocked ? "bg-gray-50" : ""}`}
                  onClick={() => onSelectProposal(p.id)}
                >
                  <td className="px-3 py-3 font-medium">
                    {p.org_name}
                  </td>
                  <td className="px-3 py-3 text-gray-600">{p.country}</td>
                  <td className="px-3 py-3 text-xs text-gray-600">{p.theme}</td>
                  <td className="px-3 py-3 font-bold tabular-nums">{p.raw_total ?? "—"}</td>
                  <td className="px-3 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${band.bg} ${band.text}`}>
                      {p.recommendation || "—"}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    {p.gates_passed === null ? "—" : p.gates_passed ? (
                      <span className="text-green-600 font-semibold text-xs">PASS</span>
                    ) : (
                      <span className="text-red-600 font-semibold text-xs">FAIL</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                    {isLocked ? (
                      <button
                        onClick={() => setUnlockConfirm(p.id)}
                        className="text-xs text-gray-400 hover:text-black"
                        title="Locked — click to unlock"
                      >
                        🔒
                      </button>
                    ) : (
                      <button
                        onClick={() => handleLock(p.id)}
                        className="text-xs text-gray-300 hover:text-black"
                        title="Click to lock"
                      >
                        🔓
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Unlock confirmation modal */}
      {unlockConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-sm font-bold mb-2">Unlock this proposal?</h3>
            <p className="text-xs text-gray-500 mb-4">
              This will allow edits again. Confirming as <span className="font-semibold text-black">{panelistName || "Unknown"}</span>.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handleUnlock(unlockConfirm)}
                className="text-xs bg-black text-white rounded px-4 py-1.5 font-medium hover:bg-gray-800"
              >
                Unlock
              </button>
              <button
                onClick={() => setUnlockConfirm(null)}
                className="text-xs text-gray-500 hover:text-black px-4 py-1.5"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}