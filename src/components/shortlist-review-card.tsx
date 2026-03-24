"use client";

import { useState } from "react";

interface QuestionData {
  answer: string;
  questions: string[];
  status: "green" | "amber" | "red";
}

interface ReviewData {
  innovation_summary: string;
  q1: QuestionData;
  q2: QuestionData;
  q3: QuestionData;
  q4: QuestionData;
  q5: QuestionData;
  outreach_email: string;
}

interface ShortlistReviewCardProps {
  proposalId: string;
  orgName: string;
  country: string;
  totalScore: number;
  modelUsed: string;
  review: ReviewData;
  defaultOpen?: boolean;
}

const QUESTION_LABELS: Record<string, string> = {
  q1: "in_country_presence",
  q2: "innovation_evidence",
  q3: "cost_and_affordability",
  q4: "fln_track_record",
  q5: "financial_flexibility",
};

const QUESTION_SHORT: Record<string, string> = {
  q1: "ICP",
  q2: "IE",
  q3: "CA",
  q4: "FLN",
  q5: "FF",
};

function StatusDot({ status }: { status: "green" | "amber" | "red" }) {
  const colors = {
    green: "bg-green-500",
    amber: "bg-amber-500",
    red: "bg-red-500",
  };
  return (
    <span
      className={`inline-block w-2.5 h-2.5 rounded-full ${colors[status]}`}
      title={status}
    />
  );
}

function StatusBadge({ label, status }: { label: string; status: "green" | "amber" | "red" }) {
  const dotColor = {
    green: "bg-green-500",
    amber: "bg-amber-500",
    red: "bg-red-500",
  };
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-gray-500 dark:text-gray-400">
      {label}
      <span className={`inline-block w-2 h-2 rounded-full ${dotColor[status]}`} />
    </span>
  );
}

function emailToHtml(text: string): string {
  if (!text) return "";
  const paragraphs = text.split(/\n\n+/).filter((p) => p.trim());
  const body = paragraphs
    .map((p) => {
      const trimmed = p.trim();
      if (trimmed.length < 80 && (trimmed.endsWith(":") || trimmed === trimmed.toUpperCase())) {
        return `<p style="margin:0 0 8px;font-weight:600">${trimmed}</p>`;
      }
      const lines = trimmed.replace(/\n/g, "<br>");
      return `<p style="margin:0 0 12px;line-height:1.6">${lines}</p>`;
    })
    .join("");
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:inherit;max-width:640px">${body}</div>`;
}

export function ShortlistReviewCard({
  orgName,
  country,
  totalScore,
  modelUsed,
  review,
  defaultOpen = false,
}: ShortlistReviewCardProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [copiedText, setCopiedText] = useState(false);
  const [copiedHtml, setCopiedHtml] = useState(false);

  async function copyAs(format: "text" | "html") {
    const text = review.outreach_email || "";
    const html = emailToHtml(text);
    try {
      if (format === "html") {
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/html": new Blob([html], { type: "text/html" }),
            "text/plain": new Blob([text], { type: "text/plain" }),
          }),
        ]);
        setCopiedHtml(true);
        setTimeout(() => setCopiedHtml(false), 2000);
      } else {
        await navigator.clipboard.writeText(text);
        setCopiedText(true);
        setTimeout(() => setCopiedText(false), 2000);
      }
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      if (format === "text") {
        setCopiedText(true);
        setTimeout(() => setCopiedText(false), 2000);
      }
    }
  }

  const summaryParagraphs = (review.innovation_summary || "")
    .split(/\n\n+/)
    .filter((p) => p.trim());

  const questions: [string, QuestionData][] = [
    ["q1", review.q1],
    ["q2", review.q2],
    ["q3", review.q3],
    ["q4", review.q4],
    ["q5", review.q5],
  ];

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg mb-2 overflow-hidden">
      {/* Clickable summary row */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-4 px-4 py-3 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
      >
        <span className="text-xs text-gray-400 w-4">{open ? "▾" : "▸"}</span>
        <span className="font-medium text-sm flex-1">{orgName}</span>
        <span className="text-sm text-gray-500 dark:text-gray-400 w-24">{country}</span>
        <span className="flex items-center gap-3">
          {questions.map(([key, q]) => (
            <StatusBadge key={key} label={QUESTION_SHORT[key]} status={q?.status || "red"} />
          ))}
        </span>
        <span className="text-sm tabular-nums w-12 text-right">{totalScore}</span>
      </button>

      {/* Expandable body */}
      {open && (
        <div className="px-6 py-5 space-y-8 border-t border-gray-200 dark:border-gray-700">
          {/* Section 1: Innovation Summary */}
          <div>
            {summaryParagraphs.map((para, i) => (
              <p key={i} className={`text-sm leading-relaxed ${i > 0 ? "mt-4" : ""}`}>
                {para}
              </p>
            ))}
          </div>

          {/* Section 2: Five Questions */}
          <div className="space-y-6">
            {questions.map(([key, q]) => {
              if (!q) return null;
              return (
                <div key={key}>
                  <div className="flex items-center gap-2 mb-2">
                    <StatusDot status={q.status} />
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      {QUESTION_LABELS[key]}
                    </span>
                  </div>
                  <div className="text-sm leading-relaxed whitespace-pre-wrap">
                    {q.answer}
                  </div>
                  {q.questions && q.questions.length > 0 && (
                    <ul className="mt-3 space-y-1">
                      {q.questions.map((question, i) => (
                        <li key={i} className="text-sm italic text-gray-600 dark:text-gray-400 pl-4">
                          {question}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>

          {/* Section 3: Outreach Email */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Outreach Email
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => copyAs("html")}
                  className="text-xs px-3 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  {copiedHtml ? "Copied" : "Copy HTML"}
                </button>
                <button
                  onClick={() => copyAs("text")}
                  className="text-xs px-3 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  {copiedText ? "Copied" : "Copy text"}
                </button>
              </div>
            </div>
            <div
              className="rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 p-5 text-sm text-gray-900 dark:text-gray-100"
              dangerouslySetInnerHTML={{ __html: emailToHtml(review.outreach_email || "") }}
            />
          </div>

          {/* Section 4: Metadata Footer */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-3 flex items-center gap-6 text-xs text-gray-400">
            <span>{orgName}</span>
            <span>{country}</span>
            <span>Score: {totalScore}/100</span>
            <span>Model: {modelUsed}</span>
          </div>
        </div>
      )}
    </div>
  );
}
