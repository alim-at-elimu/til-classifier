"use client";

import { InnovatorFolder } from "@/lib/gdrive";

interface PreflightTableProps {
  folders: InnovatorFolder[];
}

export function PreflightTable({ folders }: PreflightTableProps) {
  const errors = folders.filter((f) => !f.proposalPdf);
  const ready = folders.filter((f) => f.proposalPdf);

  return (
    <div className="mt-6">
      <h2 className="text-lg font-bold mb-1">
        Pre-flight: {folders.length} innovator folders
      </h2>
      <p className="text-sm text-gray-600 mb-3">
        {ready.length} ready to score
        {errors.length > 0 && ` · ${errors.length} missing proposal PDF`}
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-gray-300">
              <th className="text-left py-2 pr-4">#</th>
              <th className="text-left py-2 pr-4">Innovator Folder</th>
              <th className="text-left py-2 pr-4">Proposal PDF</th>
              <th className="text-left py-2 pr-4">Budget</th>
              <th className="text-left py-2 pr-4">Annexes</th>
              <th className="text-left py-2 pr-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {folders.map((folder, i) => {
              const noPdf = !folder.proposalPdf;
              return (
                <tr
                  key={folder.folderId}
                  className={`border-b border-gray-200 ${
                    noPdf ? "bg-red-50" : ""
                  }`}
                >
                  <td className="py-2 pr-4 text-gray-500">{i + 1}</td>
                  <td className="py-2 pr-4 font-medium">
                    {folder.folderName}
                  </td>
                  <td className="py-2 pr-4">
                    {folder.proposalPdf ? (
                      <span className="text-green-700">
                        {folder.proposalPdf.name}
                      </span>
                    ) : (
                      <span className="text-red-600">No PDF found</span>
                    )}
                  </td>
                  <td className="py-2 pr-4">
                    {folder.budgetXlsx ? (
                      <span className="text-green-700">
                        {folder.budgetXlsx.name}
                      </span>
                    ) : (
                      <span className="text-gray-500">Embedded in PDF</span>
                    )}
                  </td>
                  <td className="py-2 pr-4 text-gray-500">
                    {folder.annexes.length > 0
                      ? `${folder.annexes.length} file${folder.annexes.length > 1 ? "s" : ""}`
                      : "None"}
                  </td>
                  <td className="py-2 pr-4">
                    {noPdf ? (
                      <span className="text-red-600 font-medium">Blocked</span>
                    ) : (
                      <span className="text-green-700">Ready</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}