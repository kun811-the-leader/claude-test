import { prisma } from "@/lib/prisma";

/**
 * Storage Provider Adapter (spec §10, §44). "internal" works with zero
 * credentials — files live as Document rows with their text content stored
 * directly (fine for the note/report/upload-driven Knowledge flow this
 * product needs first). "google_drive" is a documented seam: implement
 * against googleapis Drive v3 once a workspace has connected Drive the same
 * way Gmail connects (see src/lib/gmail/adapter.ts for the OAuth pattern to
 * mirror) — Drive-backed Knowledge must keep working without it.
 */

export interface StorageFile {
  id: string;
  title: string;
  path: string;
  mimeType: string | null;
}

export interface StorageAdapter {
  readonly provider: "internal" | "google_drive";
  list(workspaceId: string): Promise<StorageFile[]>;
  read(fileId: string): Promise<string | null>;
  move(fileId: string, newPath: string): Promise<void>;
  rename(fileId: string, newTitle: string): Promise<void>;
  delete(fileId: string): Promise<void>;
}

class InternalStorageAdapter implements StorageAdapter {
  readonly provider = "internal" as const;

  async list(workspaceId: string): Promise<StorageFile[]> {
    const docs = await prisma.document.findMany({
      where: { workspaceId, storageProvider: "internal" },
      orderBy: { createdAt: "desc" },
    });
    return docs.map((d) => ({ id: d.id, title: d.title, path: d.storagePath ?? "/", mimeType: d.mimeType }));
  }

  async read(fileId: string): Promise<string | null> {
    const doc = await prisma.document.findUnique({ where: { id: fileId } });
    return doc?.content ?? null;
  }

  async move(fileId: string, newPath: string): Promise<void> {
    await prisma.document.update({ where: { id: fileId }, data: { storagePath: newPath } });
  }

  async rename(fileId: string, newTitle: string): Promise<void> {
    await prisma.document.update({ where: { id: fileId }, data: { title: newTitle } });
  }

  async delete(fileId: string): Promise<void> {
    await prisma.document.delete({ where: { id: fileId } });
  }
}

class GoogleDriveStorageAdapter implements StorageAdapter {
  readonly provider = "google_drive" as const;

  async list(): Promise<StorageFile[]> {
    throw new Error("Google Drive adapter not wired yet — connect Drive in 연동 and implement against Drive v3.");
  }
  async read(): Promise<string | null> {
    throw new Error("Google Drive adapter not wired yet.");
  }
  async move(): Promise<void> {
    throw new Error("Google Drive adapter not wired yet.");
  }
  async rename(): Promise<void> {
    throw new Error("Google Drive adapter not wired yet.");
  }
  async delete(): Promise<void> {
    throw new Error("Google Drive adapter not wired yet.");
  }
}

export function getStorageAdapter(provider: "internal" | "google_drive" = "internal"): StorageAdapter {
  return provider === "google_drive" ? new GoogleDriveStorageAdapter() : new InternalStorageAdapter();
}
