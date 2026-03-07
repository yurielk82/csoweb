import Link from 'next/link';
import { FileSpreadsheet, Calculator, User, ArrowRight } from 'lucide-react';

const LINKS = [
  { href: '/dashboard', icon: FileSpreadsheet, label: '정산서 조회', description: '정산 데이터 상세 조회' },
  { href: '/monthly-summary', icon: Calculator, label: '월별 합계', description: '월별 수수료 합계표' },
  { href: '/profile', icon: User, label: '내 정보', description: '회원 정보 수정' },
] as const;

export function QuickLinks() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {LINKS.map((link) => (
        <Link key={link.href} href={link.href}>
          <div className="tds-card-interactive">
            <div className="flex items-center gap-3">
              <div className="tds-icon tds-icon-blue">
                <link.icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">{link.label}</p>
                <p className="text-xs text-muted-foreground">{link.description}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
