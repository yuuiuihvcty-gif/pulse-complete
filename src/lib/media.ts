import { supabase } from "@/integrations/supabase/client";

const BUCKET = "media";
const cache = new Map<string, { url: string; expires: number }>();

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

const ALLOWED_PREFIXES = ["image/", "video/", "audio/"];
const ALLOWED_DOC_TYPES = [
  "application/pdf",
  "text/plain",
  "application/zip",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

export function validateFile(file: File | Blob, name = "file") {
  if (file.size > MAX_UPLOAD_BYTES) return `${name} is larger than 25 MB`;
  const type = file.type || "";
  const ok = ALLOWED_PREFIXES.some((p) => type.startsWith(p)) || ALLOWED_DOC_TYPES.includes(type);
  if (!ok) return "That file type isn't supported";
  return null;
}

export async function uploadMedia(userId: string, file: File | Blob, filename: string) {
  const clean = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${clean}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (error) throw error;
  return path;
}

export async function signedUrl(path: string) {
  const hit = cache.get(path);
  if (hit && hit.expires > Date.now()) return hit.url;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) throw error ?? new Error("Could not load media");
  cache.set(path, { url: data.signedUrl, expires: Date.now() + 55 * 60 * 1000 });
  return data.signedUrl;
}
