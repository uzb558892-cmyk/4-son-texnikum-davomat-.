import type { Db } from "./client.ts";
import type { ProfileRow } from "../types/database.ts";
import { ApiError, fromPostgrestError } from "../utils/errors.ts";

export async function signIn(db: Db, email: string, password: string): Promise<ProfileRow> {
  const { data, error } = await db.auth.signInWithPassword({ email, password });
  if (error || !data.user) throw new ApiError("UNAUTHENTICATED", "Email yoki parol noto‘g‘ri");
  const profile = await getMyProfile(db);
  if (!profile.is_active) {
    await db.auth.signOut();
    throw new ApiError("FORBIDDEN", "Hisob faolsizlantirilgan");
  }
  return profile;
}

export async function signOut(db: Db): Promise<void> {
  const { error } = await db.auth.signOut();
  if (error) throw new ApiError("INTERNAL", error.message);
}

/** Joriy foydalanuvchi profili (rol shu yerdan olinadi; frontend rolga ishonib qaror qilmasin — RLS baribir himoya qiladi). */
export async function getMyProfile(db: Db): Promise<ProfileRow> {
  const { data: u, error: ue } = await db.auth.getUser();
  if (ue || !u.user) throw new ApiError("UNAUTHENTICATED", "Tizimga kirilmagan");
  const { data, error } = await db.from("profiles").select("*").eq("id", u.user.id).maybeSingle();
  if (error) throw fromPostgrestError(error);
  if (!data) throw new ApiError("FORBIDDEN", "Profil topilmadi: hisobga ruxsat berilmagan");
  return data;
}
