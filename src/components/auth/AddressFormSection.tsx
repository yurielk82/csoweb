import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface AddressFormSectionProps {
  zipcode: string;
  address1: string;
  address2: string;
  onAddress2Change: (value: string) => void;
  onSearch: () => void;
  disabled: boolean;
}

export function AddressFormSection({
  zipcode, address1, address2, onAddress2Change, onSearch, disabled,
}: AddressFormSectionProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="address1">주소 *</Label>
      <div className="flex gap-2">
        <Input
          id="zipcode"
          type="text"
          placeholder="우편번호"
          value={zipcode}
          readOnly
          required
          disabled={disabled}
          className="w-28"
          autoComplete="postal-code"
        />
        <Button type="button" variant="outline" onClick={onSearch} disabled={disabled}>
          <Search className="h-4 w-4 mr-1" />
          주소 검색
        </Button>
      </div>
      <Input
        id="address1"
        type="text"
        placeholder="도로명 주소"
        value={address1}
        readOnly
        required
        disabled={disabled}
        autoComplete="address-line1"
      />
      <Input
        id="address2"
        type="text"
        placeholder="상세 주소를 입력하세요"
        value={address2}
        onChange={(e) => onAddress2Change(e.target.value)}
        disabled={disabled}
        autoComplete="address-line2"
      />
    </div>
  );
}
