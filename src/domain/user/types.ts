// ============================================
// User Domain Types
// ============================================

export interface User {
  id: string;
  business_number: string;
  company_name: string;
  ceo_name: string;
  zipcode: string;
  address1: string;
  address2?: string;
  phone1: string;
  phone2?: string;
  email: string;
  email2?: string;
  email_verified: boolean;
  password_hash: string;
  is_admin: boolean;
  is_approved: boolean;
  must_change_password: boolean;
  profile_complete: boolean;
  password_changed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface UserSession {
  id: string;
  business_number: string;
  company_name: string;
  email: string;
  is_admin: boolean;
  is_approved: boolean;
  must_change_password: boolean;
  profile_complete: boolean;
}

export interface CreateUserData {
  business_number: string;
  company_name: string;
  ceo_name: string;
  zipcode: string;
  address1: string;
  address2?: string;
  phone1: string;
  phone2?: string;
  email: string;
  email2?: string;
  password_hash: string;
}

export interface UpdateUserData {
  company_name?: string;
  ceo_name?: string;
  zipcode?: string;
  address1?: string;
  address2?: string;
  phone1?: string;
  phone2?: string;
  email?: string;
  email2?: string;
  is_admin?: boolean;
  is_approved?: boolean;
}
