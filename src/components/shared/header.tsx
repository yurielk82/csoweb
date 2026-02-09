'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  FileSpreadsheet, 
  LogOut, 
  Menu, 
  X, 
  User,
  Settings,
  LayoutDashboard,
  Upload,
  Users,
  Columns,
  Mail,
  MailPlus,
  Database,
  UserCog,
  Search,
  Calculator,
  ShieldCheck,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';

export function Header() {
  const router = useRouter();
  const { user, isMounted, clearUser } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      // 1. 클라이언트 상태 먼저 초기화 (즉각 UI 반영)
      clearUser();
      // 2. 서버 세션 삭제
      await fetch('/api/auth/logout', { method: 'POST' });
      // 3. 로그인 페이지로 이동
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      // 에러가 나도 로그인 페이지로 이동
      router.push('/login');
    }
  };

  // 마운트 전이거나 사용자 정보 없으면 로딩 상태 (Hydration 안전)
  if (!isMounted || !user) {
    return (
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <Link href="/" className="flex items-center gap-2 mr-6">
            <FileSpreadsheet className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg hidden sm:inline">CSO Portal</span>
          </Link>
          <div className="flex-1" />
          {/* 마운트 전에는 스피너 숨김 (Hydration 일치) */}
          {isMounted && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
        </div>
      </header>
    );
  }

  const adminMenuItems = [
    { href: '/admin', label: '대시보드', icon: LayoutDashboard },
    { href: '/admin/master', label: '정산서 마스터 조회', icon: Search },
    { href: '/admin/upload', label: '엑셀 업로드', icon: Upload },
    { href: '/admin/integrity', label: '무결성 검증', icon: ShieldCheck },
    { href: '/admin/columns', label: '컬럼 설정', icon: Columns },
    { href: '/admin/data', label: '데이터 관리', icon: Database },
    { href: '/admin/approvals', label: '회원 승인', icon: Users },
    { href: '/admin/members', label: '회원 관리', icon: UserCog },
    { href: '/admin/emails', label: '이메일 이력', icon: Mail },
    { href: '/admin/mailmerge', label: '메일머지', icon: MailPlus },
  ];

  const userMenuItems = [
    { href: '/dashboard', label: '정산서 조회', icon: FileSpreadsheet },
    { href: '/monthly-summary', label: '월별 합계', icon: Calculator },
  ];

  const menuItems = user.is_admin ? adminMenuItems : userMenuItems;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        {/* Logo */}
        <Link href={user.is_admin ? '/admin' : '/dashboard'} className="flex items-center gap-2 mr-6">
          <FileSpreadsheet className="h-6 w-6 text-primary" />
          <span className="font-bold text-lg hidden sm:inline">CSO Portal</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1 flex-1">
          {menuItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <Button variant="ghost" size="sm" className="gap-2">
                <item.icon className="h-4 w-4" />
                {item.label}
              </Button>
            </Link>
          ))}
        </nav>

        {/* User Menu */}
        <div className="flex items-center gap-2 ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="text-xs">
                    {user.company_name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden sm:inline max-w-[150px] truncate">
                  {user.company_name}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{user.company_name}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile" className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  내 정보 수정
                </Link>
              </DropdownMenuItem>
              {user.is_admin && (
                <DropdownMenuItem asChild>
                  <Link href="/admin/settings" className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    사이트 설정
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem disabled className="text-muted-foreground">
                <span className="mr-2 h-4 w-4" />
                {user.is_admin ? '관리자' : '업체'} ({user.business_number})
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600 cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                로그아웃
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mobile Menu Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <nav className="md:hidden border-t p-4 space-y-2 bg-background">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileMenuOpen(false)}
            >
              <Button variant="ghost" className="w-full justify-start gap-2">
                <item.icon className="h-4 w-4" />
                {item.label}
              </Button>
            </Link>
          ))}
          <Link href="/profile" onClick={() => setMobileMenuOpen(false)}>
            <Button variant="ghost" className="w-full justify-start gap-2">
              <User className="h-4 w-4" />
              내 정보 수정
            </Button>
          </Link>
          {user.is_admin && (
            <Link href="/admin/settings" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="ghost" className="w-full justify-start gap-2">
                <Settings className="h-4 w-4" />
                사이트 설정
              </Button>
            </Link>
          )}
        </nav>
      )}
    </header>
  );
}
