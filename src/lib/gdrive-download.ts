import * as XLSX from "xlsx";

const DRIVE_API = "https://www.googleapis.com/drive/v3";

export async function downloadFileAsArrayBuffer(
  fileId: string,
  accessToken: string | (() => string),
  retryCount = 0
): Promise<ArrayBuffer> {
  const token = typeof accessToken === "function" ? accessToken() : accessToken;
  const res = await fetch(
    `${DRIVE_API}/files/${fileId}?alt=media`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (res.status === 401 && retryCount < 2) {
    // Token expired — wait a moment for background refresh, then retry with fresh token
    await new Promise((r) => setTimeout(r, 3000));
    return downloadFileAsArrayBuffer(fileId, accessToken, retryCount + 1);
  }
  if (!res.ok) {
    throw new Error(`GDrive download failed: ${res.status} ${res.statusText}`);
  }
  return res.arrayBuffer();
}

export async function downloadPdfAsBase64(
  fileId: string,
  accessToken: string | (() => string)
): Promise<string> {
  const buf = await downloadFileAsArrayBuffer(fileId, accessToken);
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function extractCostContext(
  fileId: string,
  accessToken: string | (() => string)
): Promise<string> {
  try {
    const buf = await downloadFileAsArrayBuffer(fileId, accessToken);
    const wb = XLSX.read(new Uint8Array(buf), { type: "array" });

    const tabsToExtract = [
      "1. Pilot Costs",
      "2. At Scale",
      "3. Scale-Up Pathway",
      "4. Technology Costs",
    ];

    const parts: string[] = [];
    for (const name of tabsToExtract) {
      if (!wb.SheetNames.includes(name)) continue;
      const ws = wb.Sheets[name];
      const rows: (string | number | boolean | null | undefined)[][] = XLSX.utils.sheet_to_json(ws, {
        header: 1,
        defval: "",
      });
      const lines = rows
        .filter((r) =>
          r.some((c) => c !== "" && c !== null && c !== undefined)
        )
        .map((r) =>
          r
            .map((c) => String(c ?? "").trim())
            .filter((_, i, a) => i === 0 || a[i] !== "")
            .join(" | ")
        );
      parts.push(`--- Tab: ${name} ---\n${lines.join("\n")}`);
    }

    return parts.join("\n\n");
  } catch (e: unknown) {
    return `(Cost template attached but could not be parsed: ${e instanceof Error ? e.message : String(e)})`;
  }
}