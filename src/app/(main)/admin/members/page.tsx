'use client';

import { Users, Loader2 } from 'lucide-react';
import { useMembers } from '@/hooks/useMembers';
import { useMemberActions } from '@/hooks/useMemberActions';
import { MemberStatsCards } from '@/components/admin/members/MemberStatsCards';
import { MemberFilters } from '@/components/admin/members/MemberFilters';
import { MemberTable } from '@/components/admin/members/MemberTable';
import { MemberDialogGroup } from '@/components/admin/members/MemberDialogGroup';

export default function MembersPage() {
  const m = useMembers();
  const a = useMemberActions({
    fetchUsers: m.fetchUsers, setProcessing: m.setProcessing,
    setDeleteUser: m.setDeleteUser, setDeleting: m.setDeleting,
    setResetUser: m.setResetUser, setResetting: m.setResetting,
    setExporting: m.setExporting, setRejectDialog: m.setRejectDialog,
    setRejectReason: m.setRejectReason, setBatchProcessing: m.setBatchProcessing,
    selectedUsers: m.selectedUsers, setSelectedUsers: m.setSelectedUsers,
    filteredUsers: m.filteredUsers, filter: m.filter,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6" />회원 관리
          {m.loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </h1>
        <p className="text-muted-foreground">전체 회원을 조회하고 관리합니다.</p>
      </div>

      <MemberStatsCards stats={m.stats} onFilterChange={m.handleFilterChange} />

      <MemberFilters
        search={m.search} onSearchChange={m.setSearch} filter={m.filter} onFilterChange={m.handleFilterChange}
        pendingCount={m.stats.pending} selectedCount={m.selectedUsers.size} batchProcessing={m.batchProcessing}
        onBatchApprove={a.handleBatchApprove} exporting={m.exporting} onExport={a.handleExportExcel} filteredCount={m.filteredUsers.length}
      />

      <MemberTable
        users={m.filteredUsers} filter={m.filter} loading={m.loading}
        selectedUsers={m.selectedUsers} batchProcessing={m.batchProcessing} processing={m.processing}
        onToggleSelect={m.toggleSelect} onToggleSelectAll={m.toggleSelectAll}
        onApprove={a.handleApprove} onReject={(u) => m.setRejectDialog({ open: true, user: u })}
        onEdit={m.handleEdit} onResetPassword={(u) => m.setResetUser(u)} onDelete={(u) => m.setDeleteUser(u)}
      />

      <MemberDialogGroup
        editUser={m.editUser} editForm={m.editForm} saving={m.saving}
        onEditFormChange={m.setEditForm} onEditClose={() => m.setEditUser(null)} onEditSave={m.handleSaveEdit}
        deleteUser={m.deleteUser} deleting={m.deleting} onDeleteClose={() => m.setDeleteUser(null)} onDelete={() => a.handleDelete(m.deleteUser)}
        resetUser={m.resetUser} resetting={m.resetting} onResetClose={() => m.setResetUser(null)} onReset={() => a.handleResetPassword(m.resetUser)}
        rejectOpen={m.rejectDialog.open} rejectUser={m.rejectDialog.user} rejectReason={m.rejectReason} rejectProcessing={m.processing !== null}
        onRejectReasonChange={m.setRejectReason}
        onRejectClose={() => { m.setRejectDialog({ open: false, user: null }); m.setRejectReason(''); }}
        onReject={() => a.handleReject(m.rejectDialog.user, m.rejectReason)}
      />
    </div>
  );
}
