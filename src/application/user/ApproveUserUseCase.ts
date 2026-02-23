// ============================================
// Approve User Use Case
// ============================================

import { getUserRepository } from '@/infrastructure/supabase';
import type { User } from '@/domain/user';

export async function approveUser(businessNumber: string): Promise<User | null> {
  const userRepo = getUserRepository();
  return userRepo.approve(businessNumber);
}

export async function rejectUser(businessNumber: string): Promise<boolean> {
  const userRepo = getUserRepository();
  return userRepo.reject(businessNumber);
}
