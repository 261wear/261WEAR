import "server-only";
import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { hosted } from "./site";

export const LOCAL_UPLOAD_DIR = path.join(process.cwd(), ".data", "uploads");

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

// The declared type comes from the browser: check the real file signature too,
// so nothing else (HTML, SVG, scripts) can be stored as an "image".
function sniff(bytes: Uint8Array): string | null {
  const b = (i: number) => bytes[i];
  if (b(0) === 0xff && b(1) === 0xd8 && b(2) === 0xff) return "image/jpeg";
  if (b(0) === 0x89 && b(1) === 0x50 && b(2) === 0x4e && b(3) === 0x47) return "image/png";
  if (b(0) === 0x47 && b(1) === 0x49 && b(2) === 0x46 && b(3) === 0x38) return "image/gif";
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.slice(from, to));
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  return null;
}

async function checkedImage(file: File) {
  if (file.size > 4 * 1024 * 1024) throw new Error("Image trop lourde (4 Mo max).");
  if (file.size < 16) throw new Error("Fichier vide ou illisible.");
  const type = sniff(new Uint8Array(await file.slice(0, 16).arrayBuffer()));
  const ext = type ? EXT[type] : undefined;
  if (!type || !ext) throw new Error("Format d'image non supporté (JPG, PNG, WEBP, GIF).");
  return { file: new File([file], `image.${ext}`, { type }), ext };
}

// Supabase Storage: public bucket "photos", created on the first upload.
const BUCKET = "photos";
const bucketReady = globalThis as unknown as { __bucket?: Promise<void> };

async function supabase(pathname: string, init: RequestInit) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return fetch(`${process.env.SUPABASE_URL!.replace(/\/$/, "")}/storage/v1/${pathname}`, {
    ...init,
    headers: { authorization: `Bearer ${key}`, apikey: key, ...init.headers },
  });
}

function ensureBucket() {
  bucketReady.__bucket ??= supabase("bucket", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true }),
  }).then(async (res) => {
    // Already there: Supabase answers 400/409 "already exists".
    if (!res.ok && !/exists/i.test(await res.text())) {
      bucketReady.__bucket = undefined;
      throw new Error("Stockage Supabase inaccessible : vérifiez SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY.");
    }
  });
  return bucketReady.__bucket;
}

async function store(name: string, folder: string, file: File) {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    await ensureBucket();
    const key = `${folder}/${name}`;
    const res = await supabase(`object/${BUCKET}/${key}`, {
      method: "POST",
      headers: { "content-type": file.type, "cache-control": "max-age=31536000", "x-upsert": "true" },
      body: file,
    });
    if (!res.ok) throw new Error(`Envoi de l'image refusé par Supabase (${res.status}).`);
    return `${process.env.SUPABASE_URL.replace(/\/$/, "")}/storage/v1/object/public/${BUCKET}/${key}`;
  }
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import("@vercel/blob");
    // No random suffix: the thumbnail URL is derived from the image URL (see lib/images).
    const blob = await put(`${folder}/${name}`, file, {
      access: "public",
      contentType: file.type,
      addRandomSuffix: false,
      cacheControlMaxAge: 31536000,
    });
    return blob.url;
  }
  if (hosted) {
    throw new Error("Stockage d'images non configuré : ajoutez SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY.");
  }
  await mkdir(LOCAL_UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(LOCAL_UPLOAD_DIR, name), Buffer.from(await file.arrayBuffer()));
  return `/api/files/${name}`;
}

// Saves an image; for products, also its thumbnail ("<name>-t.jpg") when given.
export async function saveImage(file: File, folder: "products" | "proofs", thumb?: File | null) {
  const full = await checkedImage(file);
  const base = `${folder}-${Date.now()}-${randomBytes(6).toString("hex")}`;
  const small = folder === "products" && thumb ? await checkedImage(thumb) : null;
  if (small && small.ext !== "jpg") throw new Error("Vignette invalide.");
  const url = await store(`${base}.${full.ext}`, folder, full.file);
  if (small) await store(`${base}-t.jpg`, folder, small.file);
  return url;
}

export async function readLocalImage(name: string) {
  if (!/^[a-z]+-\d+-[a-f0-9]+(-t)?\.(jpg|png|webp|gif)$/.test(name)) return null;
  try {
    const data = await readFile(path.join(LOCAL_UPLOAD_DIR, name));
    const ext = name.split(".").pop()!;
    const type = Object.entries(EXT).find(([, e]) => e === ext)![0];
    return { data, type };
  } catch {
    return null;
  }
}
