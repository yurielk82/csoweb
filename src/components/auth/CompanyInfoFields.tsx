import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CompanyInfoFieldsProps {
  companyName: string;
  ceoName: string;
  onCompanyNameChange: (value: string) => void;
  onCeoNameChange: (value: string) => void;
  disabled: boolean;
}

export function CompanyInfoFields({
  companyName,
  ceoName,
  onCompanyNameChange,
  onCeoNameChange,
  disabled,
}: CompanyInfoFieldsProps) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="company_name">업체명 *</Label>
        <Input
          id="company_name"
          type="text"
          placeholder="업체명을 입력하세요"
          value={companyName}
          onChange={(e) => onCompanyNameChange(e.target.value)}
          required
          disabled={disabled}
          autoComplete="organization"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="ceo_name">대표자명 *</Label>
        <Input
          id="ceo_name"
          type="text"
          placeholder="대표자명을 입력하세요"
          value={ceoName}
          onChange={(e) => onCeoNameChange(e.target.value)}
          required
          disabled={disabled}
          autoComplete="name"
        />
      </div>
    </>
  );
}
