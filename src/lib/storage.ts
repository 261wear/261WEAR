import "server-only";
import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export const LOCAL_UPLOAD_DIR = path.join(process.cwd(), ".data", "uploads");

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export async function saveImage(file: File, folder: "products" | "proofs") {
  const ext = EXT[file.type];
  if (!ext) throw new Error("Format d'image non supporté (JPG, PNG, WEBP).");
  if (file.size > 4 * 1024 * 1024) throw new Error("Image trop lourde (4 Mo max).");
  const name = `${folder}-${Date.now()}-${randomBytes(6).toString("hex")}.${ext}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import("@vercel/blob");
    const blob = await put(`${folder}/${name}`, file, { access: "public", contentType: file.type });
    return blob.url;
  }
  if (process.env.VERCEL) {
    throw new Error("Stockage d'images non configuré : ajoutez Vercel Blob (Storage).");
  }
  await mkdir(LOCAL_UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(LOCAL_UPLOAD_DIR, name), Buffer.from(await file.arrayBuffer()));
  return `/api/files/${name}`;
}

export async function readLocalImage(name: string) {
  if (!/^[a-z]+-\d+-[a-f0-9]+\.(jpg|png|webp|gif)$/.test(name)) return null;
  try {
    const data = await readFile(path.join(LOCAL_UPLOAD_DIR, name));
    const ext = name.split(".").pop()!;
    const type = Object.entries(EXT).find(([, e]) => e === ext)![0];
    return { data, type };
  } catch {
    return null;
  }
}
