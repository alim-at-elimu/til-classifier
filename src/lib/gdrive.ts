export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  role: "narrative" | "cost" | "annex";
}

export interface InnovatorFolder {
  folderId: string;
  folderName: string;
  files: DriveFile[];
  proposalPdf: DriveFile | null;
  budgetXlsx: DriveFile | null;
  annexes: DriveFile[];
}

const DRIVE_API = "https://www.googleapis.com/drive/v3";

function assignRoles(files: DriveFile[]): DriveFile[] {
  const sorted = [...files].sort((a, b) => a.name.localeCompare(b.name));

  return sorted.map((f) => {
    const nameLower = f.name.toLowerCase();
    if (/doc.?1[^0-9]/i.test(nameLower)) {
      return { ...f, role: "narrative" as const };
    }
    if (/doc.?2[^0-9]/i.test(nameLower)) {
      return { ...f, role: "cost" as const };
    }
    return { ...f, role: "annex" as const };
  });
}

async function listSubFolders(
  parentFolderId: string,
  accessToken: string
): Promise<{ id: string; name: string; mimeType: string }[]> {
  const query = `'${parentFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const res = await fetch(
    `${DRIVE_API}/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType)&pageSize=100`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) throw new Error(`Drive API error: ${res.status}`);
  const data = await res.json();
  return data.files || [];
}

async function listFilesInFolder(
  folderId: string,
  accessToken: string
): Promise<{ id: string; name: string; mimeType: string }[]> {
  const query = `'${folderId}' in parents and mimeType != 'application/vnd.google-apps.folder' and trashed = false`;
  const res = await fetch(
    `${DRIVE_API}/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType)&pageSize=100`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) throw new Error(`Drive API error: ${res.status}`);
  const data = await res.json();
  return data.files || [];
}

export async function scanRootFolder(
  rootFolderId: string,
  accessToken: string
): Promise<InnovatorFolder[]> {
  const subFolders = await listSubFolders(rootFolderId, accessToken);
  const results: InnovatorFolder[] = [];

  for (const folder of subFolders) {
    const rawFiles = await listFilesInFolder(folder.id, accessToken);
    const files = assignRoles(
      rawFiles.map((f) => ({ ...f, role: "annex" as const }))
    );

    const proposalPdf = files.find((f) => f.role === "narrative") || null;
    const budgetXlsx = files.find((f) => f.role === "cost") || null;
    const annexes = files.filter(
      (f) =>
        f.role === "annex" &&
        f.id !== proposalPdf?.id &&
        f.id !== budgetXlsx?.id
    );

    results.push({
      folderId: folder.id,
      folderName: folder.name,
      files,
      proposalPdf,
      budgetXlsx,
      annexes,
    });
  }

  return results.sort((a, b) => a.folderName.localeCompare(b.folderName));
}