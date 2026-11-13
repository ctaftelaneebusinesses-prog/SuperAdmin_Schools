import axios from "axios";
import { api } from "./axios";

/**
 * File uploads to Cloudflare R2 / storage via backend API endpoints
 * (`storage.from(bucket).upload(path, file)`).
 */
type Result<T> = { data: T; error: null } | { data: null; error: Error };

async function attempt<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    return { data: await fn(), error: null };
  } catch (err) {
    const message = axios.isAxiosError(err)
      ? ((err.response?.data as { message?: string } | undefined)?.message ?? err.message)
      : (err as Error).message;
    return { data: null, error: new Error(message) };
  }
}

function bucketApi(bucket: string) {
  const base = `/storage/${encodeURIComponent(bucket)}`;
  return {
    upload(path: string, file: File | Blob, _options?: { upsert?: boolean; cacheControl?: string }) {
      return attempt(async () => {
        const contentType = file.type || "application/octet-stream";
        const { data } = await api.post<{ data: { signedUrl: string } }>(`${base}/upload-url`, { path, contentType });
        const response = await fetch(data.data.signedUrl, { method: "PUT", body: file, headers: { "Content-Type": contentType } });
        if (!response.ok) throw new Error(`Upload failed (${response.status})`);
        return { path };
      });
    },

    getPublicUrl(path: string) {
      const root = (import.meta.env.VITE_STORAGE_PUBLIC_URL ?? "").replace(/\/$/, "");
      return { data: { publicUrl: `${root}/${bucket}/${path}` } };
    },

    remove(paths: string[]) {
      return attempt(async () => {
        const { data } = await api.post<{ data: { name: string }[] }>(`${base}/remove`, { paths });
        return data.data;
      });
    },

    list(folder: string) {
      return attempt(async () => {
        const { data } = await api.get<{ data: { name: string }[] }>(`${base}/list`, { params: { folder } });
        return data.data;
      });
    },
  };
}

export const storage = {
  from: bucketApi,
};
