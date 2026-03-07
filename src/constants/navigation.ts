import {
  FileSpreadsheet,
  LayoutDashboard,
  Upload,
  Columns,
  Database,
  Users,
  UserCog,
  Link2,
  Mail,
  MailPlus,
  Search,
  Calculator,
  Settings,
  Monitor,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/* ─── 메뉴 타입 ─── */
export interface MenuItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface MenuGroup {
  label: string;
  icon: LucideIcon;
  items: MenuItem[];
}

export type NavEntry = MenuItem | MenuGroup;

export function isGroup(entry: NavEntry): entry is MenuGroup {
  return 'items' in entry;
}

/* ─── 관리자 메뉴 구조 (그룹 드롭다운) ─── */
export const ADMIN_NAV: NavEntry[] = [
  { href: '/admin', label: '대시보드', icon: LayoutDashboard },
  {
    label: '정산 관리',
    icon: FileSpreadsheet,
    items: [
      { href: '/admin/upload', label: '정산서 업로드', icon: Upload },
      { href: '/admin/columns', label: '컬럼 설정', icon: Columns },
      { href: '/admin/data', label: '데이터 관리', icon: Database },
    ],
  },
  {
    label: '회원 관리',
    icon: Users,
    items: [
      { href: '/admin/members', label: '회원 관리', icon: UserCog },
      { href: '/admin/integrity', label: '거래처 매핑', icon: Link2 },
    ],
  },
  {
    label: '이메일',
    icon: Mail,
    items: [
      { href: '/admin/mailmerge', label: '메일머지', icon: MailPlus },
      { href: '/admin/emails', label: '이메일 이력', icon: Mail },
    ],
  },
  { href: '/admin/master', label: '마스터 조회', icon: Search },
];

/* ─── 일반 사용자 메뉴 ─── */
export const USER_NAV: NavEntry[] = [
  { href: '/home', label: '홈', icon: LayoutDashboard },
  { href: '/dashboard', label: '정산서 조회', icon: FileSpreadsheet },
  { href: '/monthly-summary', label: '월별 합계', icon: Calculator },
];

/* ─── 관리자 설정 링크 (데스크톱/모바일 공용) ─── */
export const ADMIN_SETTINGS_LINKS: MenuItem[] = [
  { href: '/admin/settings', label: '사이트 설정', icon: Settings },
  { href: '/admin/email-settings', label: '이메일 설정', icon: Mail },
  { href: '/admin/system', label: '시스템 정보', icon: Monitor },
];
