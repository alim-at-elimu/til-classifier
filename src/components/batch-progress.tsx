"use client";

import { BatchProgress } from "@/lib/batch-runner";

interface BatchProgressProps {
  progress: BatchProgress;
}

const REC_COLORS: Record<string, string> = {
  Excellent: "text-green-600",
  Good: "text-lime-600",
  Weak: "text-amber-600",
  Fail: "text-red-600",
  "Previously scored": "text-gray-500",
};

export function BatchProgressDashboard({ progress }: BatchProgressProps) {
  const pct = progress.total > 0
    ? Math.round((progress.completed / progress.total) * 100)
    : 0;

  return (
    <div className="mt-6">
      <div className="flex items-center gap-3 mb-3">
  <h2 className="text-lg font-bold">Batch Scoring</h2>
  {progress.runLabel && (
    <span className="text-sm font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{progress.runLabel}</span>
  )}
</div>
      
      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span>
            {progress.completed} / {progress.total} proposals
          </span>
          <span>{pct}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded h-3">
          <div
            className="bg-blue-600 h-3 rounded transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Current status */}
      {progress.currentOrg && (
        <div className="text-sm mb-4 p-3 bg-blue-50 rounded">
          <span className="font-medium">{progress.currentOrg}</span>
          {progress.currentStep && (
            <span className="text-gray-600 ml-2">{progress.currentStep}</span>
          )}
        </div>
      )}

      {/* Completed results */}
      {progress.scored.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-bold mb-2">
            Scored ({progress.scored.length})
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-300">
                  <th className="text-left py-1 pr-4">#</th>
                  <th className="text-left py-1 pr-4">Organisation</th>
                  <th className="text-left py-1 pr-4">Score</th>
                  <th className="text-left py-1 pr-4">Band</th>
                </tr>
              </thead>
              <tbody>
                {progress.scored.map((s, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-1 pr-4 text-gray-500">{i + 1}</td>
                    <td className="py-1 pr-4">{s.org}</td>
                    <td className="py-1 pr-4 font-mono font-bold">
                      {s.total || "—"}
                    </td>
                    <td
                      className={`py-1 pr-4 font-medium ${
                        REC_COLORS[s.rec] || "text-gray-600"
                      }`}
                    >
                      {s.rec}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Errors */}
      {progress.errors.length > 0 && (
        <div>
          <h3 className="text-sm font-bold mb-2 text-red-600">
            Errors ({progress.errors.length})
          </h3>
          {progress.errors.map((e, i) => (
            <div
              key={i}
              className="text-sm p-2 mb-1 bg-red-50 rounded border border-red-200"
            >
              <span className="font-medium">{e.org}:</span>{" "}
              <span className="text-red-700">{e.error}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}