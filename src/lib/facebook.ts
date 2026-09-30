import "server-only";
import { query, type Row } from "./db";
import { readLocalImage } from "./storage";

// Facebook Page publishing through the Graph API.
// Needs a Page access token with pages_manage_posts + pages_read_engagement.

export const FB_MAX_PHOTOS = 10;

function config() {
  const pageId = process.env.FACEBOOK_PAGE_ID ?? "";
  const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN ?? "";
  const version = process.env.FACEBOOK_GRAPH_VERSION || "v23.0";
  const base = (process.env.FACEBOOK_GRAPH_URL || "https://graph.facebook.com").replace(/\/$/, "");
  return { pageId, token, graph: `${base}/${version}` };
}

export function facebookConfigured() {
  const c = config();
  return Boolean(c.pageId && c.token);
}

async function graph(path: string, body: FormData | URLSearchParams | null) {
  const { graph } = config();
  const res = await fetch(`${graph}${path}`, body ? { method: "POST", body } : undefined);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    const msg = data.error?.message ?? `HTTP ${res.status}`;
    throw new Error(`Facebook : ${msg}`);
  }
  return data;
}

export async function getPageName(): Promise<{ name?: string; error?: string }> {
  const { pageId, token } = config();
  try {
    const data = await graph(`/${pageId}?fields=name&access_token=${encodeURIComponent(token)}`, null);
    return { name: data.name };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

async function loadImage(url: string): Promise<Blob> {
  if (url.startsWith("/api/files/")) {
    const file = await readLocalImage(url.slice("/api/files/".length));
    if (!file) throw new Error("Image introuvable");
    return new Blob([new Uint8Array(file.data)], { type: file.type });
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Image inaccessible (${res.status})`);
  return res.blob();
}

// Uploads the photos unpublished, then creates one post with all of them.
export async function publishPhotoPost(images: string[], message: string, scheduledAt: Date | null) {
  const { pageId, token } = config();
  const mediaIds: string[] = [];
  for (const url of images) {
    const form = new FormData();
    form.append("source", await loadImage(url), "photo.jpg");
    form.append("published", "false");
    if (scheduledAt) form.append("temporary", "true");
    form.append("access_token", token);
    const data = await graph(`/${pageId}/photos`, form);
    mediaIds.push(String(data.id));
  }
  const body = new URLSearchParams({ message, access_token: token });
  mediaIds.forEach((id, i) => body.append(`attached_media[${i}]`, JSON.stringify({ media_fbid: id })));
  if (scheduledAt) {
    body.append("published", "false");
    body.append("scheduled_publish_time", String(Math.floor(scheduledAt.getTime() / 1000)));
  }
  const data = await graph(`/${pageId}/feed`, body);
  return String(data.id);
}

// ---------- History ----------

export type FbPost = {
  id: number;
  fbPostId: string | null;
  message: string;
  productIds: number[];
  photoCount: number;
  scheduledAt: Date | null;
  status: "publie" | "programme" | "erreur";
  error: string;
  createdAt: Date;
};

function toPost(r: Row): FbPost {
  return {
    id: r.id,
    fbPostId: r.fb_post_id,
    message: r.message,
    productIds: JSON.parse(r.product_ids || "[]"),
    photoCount: Number(r.photo_count),
    scheduledAt: r.scheduled_at ? new Date(r.scheduled_at) : null,
    status: r.status,
    error: r.error,
    createdAt: new Date(r.created_at),
  };
}

export async function logPost(p: Omit<FbPost, "id" | "createdAt">) {
  await query(
    `INSERT INTO fb_posts (fb_post_id, message, product_ids, photo_count, scheduled_at, status, error)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [p.fbPostId, p.message, JSON.stringify(p.productIds), p.photoCount, p.scheduledAt, p.status, p.error],
  );
}

export async function listPosts(limit = 20) {
  const rows = await query(`SELECT * FROM fb_posts ORDER BY id DESC LIMIT $1`, [limit]);
  return rows.map(toPost);
}
