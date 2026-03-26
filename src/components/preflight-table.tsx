"use client";

import { useEffect, useState, useMemo } from "react";
import { InnovatorFolder } from "@/lib/gdrive";
import { supabase } from "@/lib/supabase";

interface ProposalStatus {
  gdrive_folder_id: string;
  status: string;
  batch_name: string;
  batch_id: string;
}

interface PreflightTableProps {
  folders: InnovatorFolder[];
  selectedFolderIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  matchedBatch: { id: string; name: string; scored: number; errored: number; newCount: number } | null;
}

export function PreflightTable({ folders, selectedFolderIds, onSelectionChange, matchedBatch }: PreflightTableProps) {
  const [proposalStatuses, setProposalStatuses] = useState<Map<string, ProposalStatus>>(new Map());
  const [loading, setLoading] = useState(false);

  // Load existing proposal statuses for these folder IDs
  useEffect(() => {
    async function loadStatuses() {
      setLoading(true);
      const folderIds = folders.map((f) => f.folderId);
      const { data } = await supabase
        .from("proposals")
        .select("gdrive_folder_id, status, batch_id, batches!inner(name)")
        .in("gdrive_folder_id", folderIds);

      const statusMap = new Map<string, ProposalStatus>();
      if (data) {
        for (const row of data) {
          const batchInfo = row.batches as unknown as { name: string };
          statusMap.set(row.gdrive_folder_id, {
            gdrive_folder_id: row.gdrive_folder_id,
            status: row.status || "",
            batch_name: batchInfo?.name || "",
            batch_id: row.batch_id,
          });
        }
      }
      setProposalStatuses(statusMap);
      setLoading(false);
    }
    if (folders.length > 0) loadStatuses();
  }, [folders]);

  const ready = useMemo(() => folders.filter((f) => f.proposalPdf), [folders]);
  const errors = useMemo(() => folders.filter((f) => !f.proposalPdf), [folders]);

  function getRowStatus(folder: InnovatorFolder): "scored" | "error" | "new" | "blocked" {
    if (!folder.proposalPdf) return "blocked";
    const existing = proposalStatuses.get(folder.folderId);
    if (!existing) return "new";
    if (existing.status === "scored" || existing.status === "in_review" || existing.status === "finalized") return "scored";
    if (existing.status === "error") return "error";
    return "new";
  }

  function getBatchLabel(folder: InnovatorFolder): string {
    const existing = proposalStatuses.get(folder.folderId);
    return existing?.batch_name || "";
  }

  const allCheckable = ready.map((f) => f.folderId);
  const allChecked = allCheckable.length > 0 && allCheckable.every((id) => selectedFolderIds.has(id));
  const someChecked = allCheckable.some((id) => selectedFolderIds.has(id));

  function toggleAll() {
    if (allChecked) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(allCheckable));
    }
  }

  function toggleOne(folderId: string) {
    const next = new Set(selectedFolderIds);
    if (next.has(folderId)) next.delete(folderId);
    else next.add(folderId);
    onSelectionChange(next);
  }

  return (
    <div className="mt-6">
      <h2 className="text-lg font-bold mb-1">
        Pre-flight: {folders.length} innovator folders
      </h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
        {ready.length} ready to score
        {errors.length > 0 && ` · ${errors.length} missing proposal PDF`}
        {matchedBatch && (
          <span className="ml-2 text-indigo-600 dark:text-indigo-400">
            · Matched batch: <strong>{matchedBatch.name}</strong> ({matchedBatch.scored} scored, {matchedBatch.newCount} new)
          </span>
        )}
      </p>

      {loading ? (
        <div className="text-sm text-gray-400 py-8">Checking existing proposals...</div>
      ) : (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                <th className="px-3 py-2.5 text-left w-10">
                  <input
                    type="checkbox"
                    checked={allChecked}
                    ref={(el) => { if (el) el.indeterminate = someChecked && !allChecked; }}
                    onChange={toggleAll}
                    className="rounded"
                  />
                </th>
                <th className="px-3 py-2.5 text-left font-medium text-gray-600 dark:text-gray-400 w-10">#</th>
                <th className="px-3 py-2.5 text-left font-medium text-gray-600 dark:text-gray-400">Innovator</th>
                <th className="px-3 py-2.5 text-left font-medium text-gray-600 dark:text-gray-400">Proposal PDF</th>
                <th className="px-3 py-2.5 text-left font-medium text-gray-600 dark:text-gray-400">Budget</th>
                <th className="px-3 py-2.5 text-center font-medium text-gray-600 dark:text-gray-400 w-20">Annexes</th>
                <th className="px-3 py-2.5 text-center font-medium text-gray-600 dark:text-gray-400 w-28">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {folders.map((folder, i) => {
                const rowStatus = getRowStatus(folder);
                const batchLabel = getBatchLabel(folder);
                const isBlocked = rowStatus === "blocked";
                const isChecked = selectedFolderIds.has(folder.folderId);

                return (
                  <tr
                    key={folder.folderId}
                    className={`transition-colors ${
                      isBlocked
                        ? "bg-red-50/60 dark:bg-red-950/20"
                        : isChecked
                          ? "bg-indigo-50/40 dark:bg-indigo-950/20"
                          : "hover:bg-gray-50 dark:hover:bg-gray-900/50"
                    }`}
                  >
                    <td className="px-3 py-2.5">
                      {!isBlocked && (
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleOne(folder.folderId)}
                          className="rounded"
                        />
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-gray-400 tabular-nums">{i + 1}</td>
                    <td className="px-3 py-2.5 font-medium">
                      {folder.folderName}
                    </td>
                    <td className="px-3 py-2.5">
                      {folder.proposalPdf ? (
                        <span className="text-green-700 dark:text-green-400 text-xs">
                          {folder.proposalPdf.name}
                        </span>
                      ) : (
                        <span className="text-red-600 dark:text-red-400 text-xs">No PDF found</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      {folder.budgetXlsx ? (
                        <span className="text-green-700 dark:text-green-400 text-xs">
                          {folder.budgetXlsx.name}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">Embedded in PDF</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center text-gray-500">
                      {folder.annexes.length > 0
                        ? `${folder.annexes.length}`
                        : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {rowStatus === "blocked" && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400">
                          Blocked
                        </span>
                      )}
                      {rowStatus === "scored" && (
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
                          title={batchLabel || undefined}
                        >
                          Scored
                        </span>
                      )}
                      {rowStatus === "error" && (
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
                          title={batchLabel || undefined}
                        >
                          Error
                        </span>
                      )}
                      {rowStatus === "new" && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400">
                          New
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
