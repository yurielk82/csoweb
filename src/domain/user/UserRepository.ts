// ============================================
// User Repository Interface
// ============================================

import type { User, CreateUserData, UpdateUserData } from './types';

export interface UserRepository {
  create(data: CreateUserData): Promise<User>;
  findById(id: string): Promise<User | null>;
  findByBusinessNumber(businessNumber: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByBusinessNumberAndEmail(businessNumber: string, email: string): Promise<User | null>;
  findAll(): Promise<User[]>;
  findPending(): Promise<User[]>;
  approve(businessNumber: string): Promise<User | null>;
  reject(businessNumber: string): Promise<boolean>;
  update(businessNumber: string, data: UpdateUserData): Promise<boolean>;
  updatePassword(businessNumber: string, passwordHash: string): Promise<boolean>;
  updateEmail(businessNumber: string, email: string): Promise<boolean>;
  resetPasswordToDefault(businessNumber: string, passwordHash: string): Promise<boolean>;
  completePasswordChange(businessNumber: string, passwordHash: string): Promise<boolean>;
  completeProfile(businessNumber: string, data: UpdateUserData): Promise<boolean>;
  delete(businessNumber: string): Promise<boolean>;
  incrementFailedLogin(businessNumber: string): Promise<number>;
  lockAccount(businessNumber: string): Promise<boolean>;
  resetFailedLogin(businessNumber: string): Promise<boolean>;
}
