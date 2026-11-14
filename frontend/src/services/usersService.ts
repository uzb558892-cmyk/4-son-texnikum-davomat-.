import type { NewUserInput, Profile } from '../types';
import { db, isDemoMode } from './supabase';
import { demoApi } from './demoData';

export const usersService = {
  async list(): Promise<Profile[]> {
    if (isDemoMode) return demoApi.users();
    const { data, error } = await db().functions.invoke('list-users', { body: {} });
    if (error) throw error;
    return (data ?? []) as Profile[];
  },
  async create(u: NewUserInput): Promise<void> {
    if (isDemoMode) { await demoApi.createUser(u); return; }
    if (u.role !== 'group_leader') throw new Error("Yagona administrator faqat bir martalik bootstrap orqali yaratiladi.");
    const { error } = await db().functions.invoke('create-group-leader', {
      body: { email: u.email, password: u.password, full_name: u.full_name, group_id: u.group_id }
    });
    if (error) throw error;
  },
  async update(id: string, patch: Partial<Pick<Profile, 'full_name' | 'is_active' | 'group_id'>>): Promise<void> {
    if (isDemoMode) { await demoApi.updateUser(id, patch); return; }
    if (patch.group_id !== undefined) {
      const { error } = await db().functions.invoke('manage-group-leader', { body: { action: 'assign_group', user_id: id, group_id: patch.group_id } });
      if (error) throw error;
    }
    if (patch.full_name !== undefined) {
      const { error } = await db().functions.invoke('manage-group-leader', { body: { action: 'update', user_id: id, full_name: patch.full_name } });
      if (error) throw error;
    }
    if (patch.is_active !== undefined) {
      const { error } = await db().functions.invoke('manage-group-leader', { body: { action: patch.is_active ? 'activate' : 'deactivate', user_id: id } });
      if (error) throw error;
    }
  }
};
