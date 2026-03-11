import { supabase } from "@/lib/supabase";
import { InnovatorFolder } from "@/lib/gdrive";
import { downloadPdfAsBase64, extractCostContext } from "@/lib/gdrive-download";

export interface BatchProgress {
  total: number;
  completed: number;
  currentOrg: string;
  currentStep: string;
  runLabel?: string;
  errors: { org: string; error: string }[];
  scored: { org: string; total: number; rec: string }[];
  
}

export type ProgressCallback = (progress: BatchProgress) => void;

export async function runBatch(
  batchId: string,
  folders: InnovatorFolder[],
  getAccessToken: () => string,
  onProgress: ProgressCallback
): Promise<void> {
  const progress: BatchProgress = {
    total: folders.length,
    completed: 0,
    currentOrg: "",
    currentStep: "",
    errors: [],
    scored: [],
  };

  // Check which proposals are already scored (for resume)
  const { data: existingResults } = await supabase
    .from("classifier_results")
    .select("proposal_id")
    .eq("batch_id", batchId);

  const { data: existingProposals } = await supabase
    .from("proposals")
    .select("id, gdrive_folder_id, status")
    .eq("batch_id", batchId);

  const scoredFolderIds = new Set<string>();
  const existingProposalMap = new Map<string, { id: string; status: string }>();
  if (existingResults && existingProposals) {
    const scoredProposalIds = new Set(
      existingResults.map((r) => r.proposal_id)
    );
    for (const p of existingProposals) {
      existingProposalMap.set(p.gdrive_folder_id, { id: p.id, status: (p as any).status || "" });
      if (scoredProposalIds.has(p.id)) {
        scoredFolderIds.add(p.gdrive_folder_id);
      }
    }
  }

  for (const folder of folders) {
    if (!folder.proposalPdf) {
      progress.errors.push({
        org: folder.folderName,
        error: "No proposal PDF detected",
      });
      progress.completed++;
      onProgress({ ...progress });
      continue;
    }

    // Skip already scored
    if (scoredFolderIds.has(folder.folderId)) {
      progress.completed++;
      progress.scored.push({
        org: folder.folderName,
        total: 0,
        rec: "Previously scored",
      });
      onProgress({ ...progress });
      continue;
    }

    progress.currentOrg = folder.folderName;

    try {
      // Insert or reuse proposal row
      progress.currentStep = "Creating proposal record...";
      onProgress({ ...progress });

      let proposalId: string;
      const existing = existingProposalMap.get(folder.folderId);
      if (existing && (existing.status === "error" || existing.status === "scoring")) {
        // Resume: reuse existing errored/stalled proposal row
        proposalId = existing.id;
        await supabase
          .from("proposals")
          .update({ status: "scoring" })
          .eq("id", proposalId);
      } else {
        const { data: proposal, error: proposalErr } = await supabase
          .from("proposals")
          .insert({
            org_name: folder.folderName,
            gdrive_folder_id: folder.folderId,
            proposal_file_id: folder.proposalPdf.id,
            budget_file_id: folder.budgetXlsx?.id || null,
            annex_file_ids: folder.annexes.map((a) => a.id),
            status: "scoring",
            batch_id: batchId,
          })
          .select("id")
          .single();

        if (proposalErr || !proposal) throw new Error(`Supabase insert: ${proposalErr?.message || "no data"}`);
        proposalId = proposal.id;
      }

      // Download PDF
      progress.currentStep = "Downloading proposal PDF...";
      onProgress({ ...progress });
      const pdfBase64 = await downloadPdfAsBase64(
        folder.proposalPdf.id,
        getAccessToken()
      );

      // Extract cost context if XLSX exists
      let costContext = "";
      if (folder.budgetXlsx) {
        progress.currentStep = "Extracting cost template...";
        onProgress({ ...progress });
        costContext = await extractCostContext(
          folder.budgetXlsx.id,
          getAccessToken()
        );
      }

      const annexNote =
        folder.annexes.length > 0
          ? `ANNEX FILES SUBMITTED (content NOT included — apply conservative scoring for annex-reliant sub-criteria): ${folder.annexes.map((f) => f.name).join(", ")}`
          : "No annex files were submitted separately.";

      // Call scoring API route
      progress.currentStep = "Scoring (Call 1 + Call 2)...";
      onProgress({ ...progress });

      let scoreData: any;
      const MAX_RETRIES = 2;
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        const scoreRes = await fetch("/api/score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pdfBase64,
            costContext,
            annexNote,
            org: "",
            country: "",
            theme: "",
          }),
        });

        try {
          scoreData = await scoreRes.json();
        } catch (parseErr) {
          // JSON parse failed — likely rate-limited or overloaded
          if (attempt < MAX_RETRIES) {
            progress.currentStep = `Scoring failed (attempt ${attempt + 1}), retrying in 30s...`;
            onProgress({ ...progress });
            await new Promise((r) => setTimeout(r, 30_000));
            continue;
          }
          throw new Error(`Score API returned non-JSON after ${MAX_RETRIES + 1} attempts`);
        }

        if (!scoreRes.ok || scoreData.error) {
          if (attempt < MAX_RETRIES && scoreRes.status >= 500) {
            progress.currentStep = `Score API error ${scoreRes.status} (attempt ${attempt + 1}), retrying in 30s...`;
            onProgress({ ...progress });
            await new Promise((r) => setTimeout(r, 30_000));
            continue;
          }
          throw new Error(scoreData.error || `Score API ${scoreRes.status}`);
        }

        break; // success
      }

      // Write results to Supabase
      progress.currentStep = "Saving results...";
      onProgress({ ...progress });

      const { error: resultErr } = await supabase
        .from("classifier_results")
        .insert({
          proposal_id: proposalId,
          batch_id: batchId,
          call1_json: scoreData.call1,
          call2_json: scoreData.call2,
          gates_passed: scoreData.totals?.gatesPassed ?? true,
          raw_total: scoreData.totals?.total ?? 0,
          recommendation: scoreData.totals?.rec ?? "Error",
        });

      if (resultErr) throw new Error(`Supabase insert: ${resultErr.message}`);

      // Update proposal status
      await supabase
        .from("proposals")
        .update({
          status: "scored",
          org_name: scoreData.call1?.applicant?.name || folder.folderName,
          country: scoreData.call1?.applicant?.country || "",
          theme: [scoreData.call1?.applicant?.theme].flat().filter(Boolean),
        })
        .eq("id", proposalId);

      progress.scored.push({
        org: scoreData.call1?.applicant?.name || folder.folderName,
        total: scoreData.totals?.total ?? 0,
        rec: scoreData.totals?.rec ?? "Unknown",
      });

      progress.completed++;
      progress.currentStep = "";
      onProgress({ ...progress });
    } catch (err: any) {
      progress.errors.push({
        org: folder.folderName,
        error: err.message || "Unknown error",
      });
      progress.completed++;
      progress.currentStep = "";
      onProgress({ ...progress });

      // Mark proposal as error if it exists
      const { data: errProposal } = await supabase
        .from("proposals")
        .select("id")
        .eq("gdrive_folder_id", folder.folderId)
        .eq("batch_id", batchId)
        .single();

      if (errProposal) {
        await supabase
          .from("proposals")
          .update({ status: "error" as any })
          .eq("id", errProposal.id);
      }
    }
  }

  // Update batch status
  await supabase
    .from("batches")
    .update({ status: "complete" })
    .eq("id", batchId);

  progress.currentOrg = "";
  progress.currentStep = "Batch complete.";
  onProgress({ ...progress });
}