'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { API_ROUTES } from '@/constants/api';

// ── Types ──

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
  is_admin: boolean;
  is_approved: boolean;
  created_at: string;
}

export type FilterType = 'all' | 'admin' | 'approved' | 'pending';

export interface EditFormData {
  company_name: string;
  ceo_name: string;
  zipcode: string;
  address1: string;
  address2: string;
  phone1: string;
  phone2: string;
  email: string;
  email2: string;
  is_admin: boolean;
  is_approved: boolean;
}

// ── 순수 헬퍼 ──

function buildEditForm(user: User): EditFormData {
  return {
    company_name: user.company_name,
    ceo_name: user.ceo_name || '',
    zipcode: user.zipcode || '',
    address1: user.address1 || '',
    address2: user.address2 || '',
    phone1: user.phone1 || '',
    phone2: user.phone2 || '',
    email: user.email,
    email2: user.email2 || '',
    is_admin: user.is_admin,
    is_approved: user.is_approved,
  };
}

function filterUsers(users: User[], search: string, filter: FilterType) {
  return users.filter(user => {
    const searchMatch = !search ||
      user.company_name.toLowerCase().includes(search.toLowerCase()) ||
      user.business_number.includes(search) ||
      user.email.toLowerCase().includes(search.toLowerCase());

    let typeMatch = true;
    if (filter === 'admin') typeMatch = user.is_admin;
    else if (filter === 'approved') typeMatch = user.is_approved && !user.is_admin;
    else if (filter === 'pending') typeMatch = !user.is_approved && !user.is_admin;

    return searchMatch && typeMatch;
  });
}

function computeStats(users: User[]) {
  return {
    total: users.length,
    admins: users.filter(u => u.is_admin).length,
    approved: users.filter(u => u.is_approved && !u.is_admin).length,
    pending: users.filter(u => !u.is_approved && !u.is_admin).length,
  };
}

function parseInitialFilter(param: string | null): FilterType {
  if (param === 'pending' || param === 'admin' || param === 'approved') return param;
  return 'all';
}

// ── Hook: 상태 & 필터 ──

export function useMembersState() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>(() => parseInitialFilter(searchParams.get('filter')));

  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [processing, setProcessing] = useState<string | null>(null);
  const [batchProcessing, setBatchProcessing] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(API_ROUTES.USERS.LIST);
      const result = await res.json();
      if (result.success) setUsers(result.data);
    } catch (error) {
      console.error('Fetch users error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleFilterChange = useCallback((newFilter: FilterType) => {
    setFilter(newFilter);
    if (newFilter !== 'pending') setSelectedUsers(new Set());
    const params = new URLSearchParams(searchParams.toString());
    if (newFilter === 'all') params.delete('filter');
    else params.set('filter', newFilter);
    const query = params.toString();
    router.replace(`/admin/members${query ? `?${query}` : ''}`, { scroll: false });
  }, [searchParams, router]);

  const toggleSelect = useCallback((bn: string) => {
    setSelectedUsers(prev => {
      const next = new Set(prev);
      if (next.has(bn)) next.delete(bn);
      else next.add(bn);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    const pending = users.filter(u => !u.is_approved && !u.is_admin);
    if (selectedUsers.size === pending.length && pending.length > 0) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(pending.map(u => u.business_number)));
    }
  }, [users, selectedUsers.size]);

  const filteredUsers = filterUsers(users, search, filter);
  const stats = computeStats(users);

  return {
    loading, users, search, setSearch, filter, filteredUsers, stats,
    selectedUsers, setSelectedUsers, processing, setProcessing,
    batchProcessing, setBatchProcessing,
    fetchUsers, handleFilterChange, toggleSelect, toggleSelectAll,
  };
}

// ── Hook: 편집/삭제 Dialog ──

export function useMemberDialogs(fetchUsers: () => Promise<void>) {
  const { toast } = useToast();

  const [editUser, setEditUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState<EditFormData>(buildEditForm({ id: '', business_number: '', company_name: '', ceo_name: '', zipcode: '', address1: '', phone1: '', email: '', is_admin: false, is_approved: false, created_at: '' }));
  const [saving, setSaving] = useState(false);
  const [deleteUser, setDeleteUser] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [resetUser, setResetUser] = useState<User | null>(null);
  const [resetting, setResetting] = useState(false);
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; user: User | null }>({ open: false, user: null });
  const [rejectReason, setRejectReason] = useState('');

  const handleEdit = useCallback((user: User) => {
    setEditUser(user);
    setEditForm(buildEditForm(user));
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editUser) return;
    setSaving(true);
    try {
      const res = await fetch(API_ROUTES.USERS.byBusinessNumber(editUser.business_number), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: '수정 완료', description: '회원 정보가 수정되었습니다.' });
        setEditUser(null);
        fetchUsers();
      } else {
        toast({ variant: 'destructive', title: '수정 실패', description: result.error });
      }
    } catch {
      toast({ variant: 'destructive', title: '오류', description: '회원 수정 중 오류가 발생했습니다.' });
    } finally {
      setSaving(false);
    }
  }, [editUser, editForm, toast, fetchUsers]);

  return {
    editUser, setEditUser, editForm, setEditForm, saving,
    deleteUser, setDeleteUser, deleting, setDeleting,
    exporting, setExporting,
    resetUser, setResetUser, resetting, setResetting,
    rejectDialog, setRejectDialog, rejectReason, setRejectReason,
    handleEdit, handleSaveEdit,
  };
}

// ── Combined Hook (기존 인터페이스 유지) ──

export function useMembers() {
  const state = useMembersState();
  const dialogs = useMemberDialogs(state.fetchUsers);

  return { ...state, ...dialogs };
}
