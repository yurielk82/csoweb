import { EditDialog, DeleteDialog, ResetPasswordDialog, RejectDialog } from '@/components/admin/members/MemberDialogs';
import type { User, EditFormData } from '@/hooks/useMembers';

interface MemberDialogGroupProps {
  editUser: User | null;
  editForm: EditFormData;
  saving: boolean;
  onEditFormChange: (form: EditFormData) => void;
  onEditClose: () => void;
  onEditSave: () => void;
  deleteUser: User | null;
  deleting: boolean;
  onDeleteClose: () => void;
  onDelete: () => void;
  resetUser: User | null;
  resetting: boolean;
  onResetClose: () => void;
  onReset: () => void;
  rejectOpen: boolean;
  rejectUser: User | null;
  rejectReason: string;
  rejectProcessing: boolean;
  onRejectReasonChange: (v: string) => void;
  onRejectClose: () => void;
  onReject: () => void;
}

export function MemberDialogGroup(p: MemberDialogGroupProps) {
  return (
    <>
      <EditDialog user={p.editUser} form={p.editForm} saving={p.saving} onFormChange={p.onEditFormChange} onClose={p.onEditClose} onSave={p.onEditSave} />
      <DeleteDialog user={p.deleteUser} deleting={p.deleting} onClose={p.onDeleteClose} onDelete={p.onDelete} />
      <ResetPasswordDialog user={p.resetUser} resetting={p.resetting} onClose={p.onResetClose} onReset={p.onReset} />
      <RejectDialog open={p.rejectOpen} user={p.rejectUser} reason={p.rejectReason} processing={p.rejectProcessing} onReasonChange={p.onRejectReasonChange} onClose={p.onRejectClose} onReject={p.onReject} />
    </>
  );
}
