// ============================================
// Supabase User Repository Implementation
// ============================================

import { supabase, type DbUser } from './client';
import type { UserRepository } from '@/domain/user/UserRepository';
import type { User, CreateUserData, UpdateUserData } from '@/domain/user/types';

function mapDbUserToUser(dbUser: DbUser): User {
  return {
    id: dbUser.id,
    business_number: dbUser.business_number,
    company_name: dbUser.company_name,
    ceo_name: dbUser.ceo_name || '',
    zipcode: dbUser.zipcode || '',
    address1: dbUser.address1 || '',
    address2: dbUser.address2 || undefined,
    phone1: dbUser.phone1 || '',
    phone2: dbUser.phone2 || undefined,
    email: dbUser.email,
    email2: dbUser.email2 || undefined,
    email_verified: dbUser.email_verified,
    password_hash: dbUser.password_hash,
    is_admin: dbUser.is_admin,
    is_approved: dbUser.is_approved,
    must_change_password: dbUser.must_change_password || false,
    profile_complete: dbUser.profile_complete ?? true,
    password_changed_at: dbUser.password_changed_at || undefined,
    failed_login_attempts: dbUser.failed_login_attempts ?? 0,
    locked_at: dbUser.locked_at || undefined,
    created_at: dbUser.created_at,
    updated_at: dbUser.updated_at,
  };
}

export class SupabaseUserRepository implements UserRepository {
  async create(data: CreateUserData): Promise<User> {
    const { data: user, error } = await supabase
      .from('users')
      .insert({
        business_number: data.business_number,
        company_name: data.company_name,
        ceo_name: data.ceo_name,
        zipcode: data.zipcode,
        address1: data.address1,
        address2: data.address2 || null,
        phone1: data.phone1,
        phone2: data.phone2 || null,
        email: data.email,
        email2: data.email2 || null,
        password_hash: data.password_hash,
        is_admin: false,
        is_approved: false,
        email_verified: false,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return mapDbUserToUser(user);
  }

  async findById(id: string): Promise<User | null> {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !user) return null;
    return mapDbUserToUser(user);
  }

  async findByBusinessNumber(businessNumber: string): Promise<User | null> {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('business_number', businessNumber)
      .single();

    if (error || !user) return null;
    return mapDbUserToUser(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) return null;
    return mapDbUserToUser(user);
  }

  async findByBusinessNumberAndEmail(businessNumber: string, email: string): Promise<User | null> {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('business_number', businessNumber)
      .eq('email', email)
      .single();

    if (error || !user) return null;
    return mapDbUserToUser(user);
  }

  async findAll(): Promise<User[]> {
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !users) return [];
    return users.map(mapDbUserToUser);
  }

  async findPending(): Promise<User[]> {
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .eq('is_approved', false)
      .eq('is_admin', false)
      .order('created_at', { ascending: false });

    if (error || !users) return [];
    return users.map(mapDbUserToUser);
  }

  async approve(businessNumber: string): Promise<User | null> {
    const { data: user, error } = await supabase
      .from('users')
      .update({ is_approved: true, updated_at: new Date().toISOString() })
      .eq('business_number', businessNumber)
      .select()
      .single();

    if (error || !user) return null;
    return mapDbUserToUser(user);
  }

  async reject(businessNumber: string): Promise<boolean> {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('business_number', businessNumber);

    return !error;
  }

  async update(businessNumber: string, data: UpdateUserData): Promise<boolean> {
    const { error } = await supabase
      .from('users')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('business_number', businessNumber);

    return !error;
  }

  async updatePassword(businessNumber: string, passwordHash: string): Promise<boolean> {
    const { error } = await supabase
      .from('users')
      .update({ password_hash: passwordHash, updated_at: new Date().toISOString() })
      .eq('business_number', businessNumber);

    return !error;
  }

  async updateEmail(businessNumber: string, email: string): Promise<boolean> {
    const { error } = await supabase
      .from('users')
      .update({ email, updated_at: new Date().toISOString() })
      .eq('business_number', businessNumber);

    return !error;
  }

  async resetPasswordToDefault(businessNumber: string, passwordHash: string): Promise<boolean> {
    const { error } = await supabase
      .from('users')
      .update({
        password_hash: passwordHash,
        must_change_password: true,
        updated_at: new Date().toISOString(),
      })
      .eq('business_number', businessNumber);

    return !error;
  }

  async completePasswordChange(businessNumber: string, passwordHash: string): Promise<boolean> {
    const { error } = await supabase
      .from('users')
      .update({
        password_hash: passwordHash,
        must_change_password: false,
        password_changed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('business_number', businessNumber);

    return !error;
  }

  async completeProfile(businessNumber: string, data: UpdateUserData): Promise<boolean> {
    const { error } = await supabase
      .from('users')
      .update({
        ...data,
        profile_complete: true,
        updated_at: new Date().toISOString(),
      })
      .eq('business_number', businessNumber);

    return !error;
  }

  async delete(businessNumber: string): Promise<boolean> {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('business_number', businessNumber);

    return !error;
  }

  async incrementFailedLogin(businessNumber: string): Promise<number> {
    // 현재 실패 횟수 조회
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('failed_login_attempts')
      .eq('business_number', businessNumber)
      .single();

    if (fetchError || !user) return 0;

    const newCount = (user.failed_login_attempts ?? 0) + 1;

    const { error } = await supabase
      .from('users')
      .update({
        failed_login_attempts: newCount,
        updated_at: new Date().toISOString(),
      })
      .eq('business_number', businessNumber);

    if (error) return 0;
    return newCount;
  }

  async lockAccount(businessNumber: string): Promise<boolean> {
    const { error } = await supabase
      .from('users')
      .update({
        locked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('business_number', businessNumber);

    return !error;
  }

  async resetFailedLogin(businessNumber: string): Promise<boolean> {
    const { error } = await supabase
      .from('users')
      .update({
        failed_login_attempts: 0,
        locked_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('business_number', businessNumber);

    return !error;
  }
}
