// ============================================
// Register User Use Case
// ============================================

import { getUserRepository } from '@/infrastructure/supabase';
import type { User, CreateUserData } from '@/domain/user';

export async function registerUser(data: CreateUserData): Promise<User> {
  const userRepo = getUserRepository();

  // 사업자번호 중복 체크
  const existing = await userRepo.findByBusinessNumber(data.business_number);
  if (existing) {
    throw new Error('이미 등록된 사업자번호입니다.');
  }

  return userRepo.create(data);
}
