import { api } from "@/lib/axios";
import { storage } from "@/lib/storage";
import { AppUser } from "@/types/auth.types";

export interface ProfileUpdateInput {
  full_name: string;
  phone: string | null;
}

/**
 * Updates the caller's own profile fields (PATCH /auth/me).
 */
export async function updateOwnProfile(_userId: string, input: ProfileUpdateInput): Promise<AppUser> {
  const { data } = await api.patch<{ data: AppUser }>("/auth/me", input);
  return data.data;
}

/**
 * Uploads a new avatar to the `avatars` bucket, keyed `{userId}/avatar.ext`,
 * then stores the public URL on the user's profile.
 */
export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const extension = file.name.split(".").pop();
  const path = `${userId}/avatar.${extension}`;

  const { error: uploadError } = await storage
    .from("avatars")
    .upload(path, file, { upsert: true, cacheControl: "3600" });

  if (uploadError) throw uploadError;

  const { data } = storage.from("avatars").getPublicUrl(path);
  await api.patch("/auth/me", { avatar_url: data.publicUrl });
  return data.publicUrl;
}

/**
 * Removes any uploaded avatar(s) under the user's own folder and clears `avatar_url`.
 */
export async function removeAvatar(userId: string): Promise<void> {
  const { data: files, error: listError } = await storage.from("avatars").list(userId);
  if (listError) throw listError;

  if (files && files.length > 0) {
    const paths = files.map((f) => `${userId}/${f.name}`);
    const { error: removeError } = await storage.from("avatars").remove(paths);
    if (removeError) throw removeError;
  }

  await api.patch("/auth/me", { avatar_url: null });
}
