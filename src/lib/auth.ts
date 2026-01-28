import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import type { UserSession } from '@/types';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'cso-settlement-portal-secret-key-2026'
);

const COOKIE_NAME = 'cso_session';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 60 * 60 * 24, // 24 hours
  path: '/',
};

// Password hashing
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// JWT Token
export async function createToken(user: UserSession): Promise<string> {
  return new SignJWT({ user })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<UserSession | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload.user as UserSession;
  } catch {
    return null;
  }
}

// Session management
export async function setSession(user: UserSession): Promise<void> {
  const token = await createToken(user);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, COOKIE_OPTIONS);
}

export async function getSession(): Promise<UserSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  
  if (!token) return null;
  
  return verifyToken(token);
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

// Business number formatting
export function formatBusinessNumber(num: string): string {
  const digits = num.replace(/\D/g, '');
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
  }
  return num;
}

export function normalizeBusinessNumber(num: string): string {
  return num.replace(/\D/g, '');
}

// Validation
export function isValidBusinessNumber(num: string): boolean {
  const digits = num.replace(/\D/g, '');
  return digits.length === 10;
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidPassword(password: string): boolean {
  return password.length >= 6;
}
