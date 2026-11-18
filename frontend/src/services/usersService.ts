import type { NewUserInput, Profile } from '../types';
import { db } from './supabase';

export type UserRow = Profile & { is_primary?: boolean; job_title?: string | null; phone?: string | null };

export type NewAdminInput = {
  email: string;
  password: string;
  full_name: string;
  phone: string;
  job_title: string;
};

export type NewStaffInput = {
  email: string;
  password: string;
  full_name: string;
  phone: string;
  job_title: string;
  role: 'manaviyatchi' | 'navbatchi';
};

export type UserPatch = {
  full_name?: string;
  phone?: string | null;
  job_title?: string | null;
  is_active?: boolean;
  group_id?: string | null;
};

// Edge Function xatosidan o'qiladigan xabarni ajratib oladi
async function readError(error: unknown): Promise<Error> {
  const ctx = (error as { context?: Response } | null)?.context;
  if (ctx && typeof ctx.json === 'function') {
    try {
      const body = await ctx.json();
      const msg = body?.error?.message;
      if (typeof msg === 'string' && msg) return new Error(msg);
    } catch {
      /* e'tibor bermaymiz */
    }
  }
  return error instanceof Error ? error : new Error('Noma’lum xatolik');
}

async function call(fn: string, body: Record<string, unknown>): Promise<void> {
  const { error } = await db().functions.invoke(fn, { body });
  if (error) throw await readError(error);
}

export const usersService = {
  async list(): Promise<UserRow[]> {
    const { data, error } = await db().functions.invoke('list-users', { body: {} });
    if (error) throw error;
    return (data ?? []) as UserRow[];
  },
  async create(u: NewUserInput): Promise<void> {
    if (u.role !== 'group_leader') throw new Error("Administrator alohida tugma orqali qo'shiladi.");
    const { error } = await db().functions.invoke('create-group-leader', {
      body: { email: u.email, password: u.password, full_name: u.full_name, group_id: u.group_id }
    });
    if (error) throw error;
  },
  async createStaff(s: NewStaffInput): Promise<void> {
    await call('create-staff', {
      email: s.email.trim(),
      password: s.password,
      full_name: s.full_name.trim(),
      phone: s.phone.trim() || null,
      job_title: s.job_title.trim() || null,
      role: s.role
    });
  },
  async update(id: string, patch: UserPatch): Promise<void> {
    if (patch.group_id !== undefined) {
      await call('manage-user', { action: 'assign_group', user_id: id, group_id: patch.group_id });
    }
    const info: Record<string, unknown> = {};
    if (patch.full_name !== undefined) info.full_name = patch.full_name;
    if (patch.phone !== undefined) info.phone = patch.phone;
    if (patch.job_title !== undefined) info.job_title = patch.job_title;
    if (Object.keys(info).length > 0) {
      await call('manage-user', { action: 'update', user_id: id, ...info });
    }
    if (patch.is_active !== undefined) {
      await call('manage-user', { action: patch.is_active ? 'activate' : 'deactivate', user_id: id });
    }
  },
  async resetPassword(id: string, password: string): Promise<void> {
    await call('manage-user', { action: 'reset_password', user_id: id, password });
  },
  async createAdmin(a: NewAdminInput): Promise<void> {
    await call('create-admin', {
      email: a.email.trim(),
      password: a.password,
      full_name: a.full_name.trim(),
      phone: a.phone.trim() || null,
      job_title: a.job_title.trim() || null
    });
  },
  async manageAdmin(id: string, action: 'activate' | 'deactivate' | 'delete'): Promise<void> {
    await call('manage-admin', { action, user_id: id });
  }
};
