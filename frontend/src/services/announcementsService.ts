import { db } from './supabase';
import type { Announcement, NewAnnouncementInput, UpdateAnnouncementInput } from '../types';

const BUCKET = 'announcement-images';
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

function validateFiles(files: File[]) {
  for (const f of files) {
    if (!ALLOWED_TYPES.includes(f.type)) {
      throw new Error(`"${f.name}" qo'llab-quvvatlanmaydi. Faqat JPG, PNG, WEBP, GIF rasm yuklang.`);
    }
    if (f.size > MAX_BYTES) {
      throw new Error(`"${f.name}" hajmi 5 MB dan katta.`);
    }
  }
}

async function uploadFiles(userId: string, files: File[]): Promise<string[]> {
  if (!files.length) return [];
  validateFiles(files);
  const client = db();
  const urls: string[] = [];

  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const ext = (f.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    const path = `${userId}/${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await client.storage.from(BUCKET).upload(path, f, {
      cacheControl: '3600',
      upsert: false,
      contentType: f.type
    });
    if (error) throw error;
    const { data } = client.storage.from(BUCKET).getPublicUrl(path);
    urls.push(data.publicUrl);
  }
  return urls;
}

function extractStoragePath(publicUrl: string): string | null {
  try {
    const u = new URL(publicUrl);
    const marker = `/storage/v1/object/public/${BUCKET}/`;
    const idx = u.pathname.indexOf(marker);
    if (idx === -1) return null;
    return decodeURIComponent(u.pathname.slice(idx + marker.length));
  } catch {
    return null;
  }
}

async function removeStorageUrls(urls: string[]) {
  const paths = urls.map(extractStoragePath).filter((p): p is string => Boolean(p));
  if (!paths.length) return;
  const { error } = await db().storage.from(BUCKET).remove(paths);
  if (error) console.warn("Rasmni o'chirishda ogohlantirish:", error.message);
}

export const announcementsService = {
  async list(): Promise<Announcement[]> {
    const { data, error } = await db()
      .from('announcements')
      .select('id, author_id, author_name, author_role, title, body, image_urls, created_at, updated_at')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as Announcement[];
  },

  async create(userId: string, input: NewAnnouncementInput): Promise<Announcement> {
    const title = input.title.trim();
    const body = input.body.trim();
    if (!title) throw new Error('E\'lon sarlavhasini kiriting.');
    if (!body) throw new Error('E\'lon matnini kiriting.');

    const image_urls = await uploadFiles(userId, input.files ?? []);
    const { data, error } = await db()
      .from('announcements')
      .insert({
        author_id: userId,
        author_name: '',
        author_role: '',
        title,
        body,
        image_urls
      })
      .select('id, author_id, author_name, author_role, title, body, image_urls, created_at, updated_at')
      .single();

    if (error) {
      await removeStorageUrls(image_urls);
      throw error;
    }
    return data as Announcement;
  },

  async update(id: string, userId: string, input: UpdateAnnouncementInput): Promise<Announcement> {
    const title = input.title.trim();
    const body = input.body.trim();
    if (!title) throw new Error('E\'lon sarlavhasini kiriting.');
    if (!body) throw new Error('E\'lon matnini kiriting.');

    const addedUrls = await uploadFiles(userId, input.newFiles ?? []);
    const finalUrls = [...input.existingImageUrls, ...addedUrls];

    const { data, error } = await db()
      .from('announcements')
      .update({
        title,
        body,
        image_urls: finalUrls
      })
      .eq('id', id)
      .select('id, author_id, author_name, author_role, title, body, image_urls, created_at, updated_at')
      .single();

    if (error) {
      await removeStorageUrls(addedUrls);
      throw error;
    }
    return data as Announcement;
  },

  async remove(item: Announcement): Promise<void> {
    const { error } = await db().from('announcements').delete().eq('id', item.id);
    if (error) throw error;
    await removeStorageUrls(item.image_urls ?? []);
  }
};
