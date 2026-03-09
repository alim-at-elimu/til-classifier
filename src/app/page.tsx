"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { GoogleSignIn } from "@/components/google-sign-in";
import { FolderScanner } from "@/components/folder-scanner";
import { PreflightTable } from "@/components/preflight-table";
import { useGoogleAuth } from "@/lib/google-auth";
import { InnovatorFolder } from "@/lib/gdrive";

export default function Home() {
  const [dbStatus, setDbStatus] = useState("Checking...");
  const [folders, setFolders] = useState<InnovatorFolder[] | null>(null);
  const { accessToken } = useGoogleAuth();

  useEffect(() => {
    async function check() {
      const { error } = await supabase.from("batches").select("count");
      if (error) setDbStatus(`Error: ${error.message}`);
      else setDbStatus("Connected");
    }
    check();
  }, []);

  return (
    <main className="max-w-5xl mx-auto p-10 font-mono">
      <h1 className="text-2xl font-bold mb-6">TIL RFP Classifier</h1>

      <div className="flex items-center gap-6 mb-6">
        <div className="text-sm">
          Database: <span className={dbStatus === "Connected" ? "text-green-600" : "text-red-600"}>{dbStatus}</span>
        </div>
        <GoogleSignIn />
      </div>

      {accessToken && !folders && (
        <FolderScanner onScanComplete={setFolders} />
      )}

      {folders && <PreflightTable folders={folders} />}

      {folders && (
        <button
          onClick={() => setFolders(null)}
          className="mt-4 text-sm text-gray-500 underline"
        >
          Reset scan
        </button>
      )}
    </main>
  );
}