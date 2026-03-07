'use client';

import type { User, FilterType } from '@/hooks/useMembers';
import { useMemberApproval, type ApprovalParams } from '@/hooks/useMemberApproval';
import { useMemberCrud, type CrudParams } from '@/hooks/useMemberCrud';

interface MemberActionsParams extends ApprovalParams, CrudParams {
  filteredUsers: User[];
  filter: FilterType;
}

/**
 * 회원 관리 통합 액션 훅 — approval + crud 서브훅 조합
 */
export function useMemberActions(p: MemberActionsParams) {
  const approval = useMemberApproval(p);
  const crud = useMemberCrud(p);

  return { ...approval, ...crud };
}
