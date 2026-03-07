'use client';

import { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { FileSpreadsheet, LogOut, Menu, X, User, Loader2, ChevronDown } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import { API_ROUTES } from '@/constants/api';
import { HEADER_SCROLL_THRESHOLD } from '@/constants/defaults';
import {
  type MenuGroup,
  type NavEntry,
  isGroup,
  ADMIN_NAV,
  USER_NAV,
  ADMIN_SETTINGS_LINKS,
} from '@/constants/navigation';

/* ─── 그룹 드롭다운 (데스크톱 — hover로 열림, Portal 없는 순수 구현) ─── */
function NavGroupDropdown({ group, pathname }: { group: MenuGroup; pathname: string }) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isActive = group.items.some((item) => pathname === item.href);
  const firstItem = group.items[0];
  const restItems = group.items.slice(1);
  const FirstIcon = firstItem.icon;

  const handleEnter = useCallback(() => {
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
    setOpen(true);
  }, []);

  const handleLeave = useCallback(() => {
    closeTimer.current = setTimeout(() => setOpen(false), HEADER_SCROLL_THRESHOLD);
  }, []);

  return (
    <div className="relative" onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      <Link href={firstItem.href}>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'gap-1.5',
            isActive && 'bg-accent text-accent-foreground'
          )}
        >
          <FirstIcon className="h-4 w-4" />
          {firstItem.label}
          <ChevronDown className={cn("h-3 w-3 opacity-50 transition-transform", open && "rotate-180")} />
        </Button>
      </Link>
      {open && (
        <div className="absolute top-full left-0 pt-1 z-50">
          <div className="w-48 rounded-md border bg-popover p-1 shadow-md animate-in fade-in-0 zoom-in-95 slide-in-from-top-2">
            {restItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  'flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer',
                  pathname === item.href && 'bg-accent'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── 데스크톱 네비게이션 ─── */
function DesktopNav({ entries, pathname }: { entries: NavEntry[]; pathname: string }) {
  return (
    <nav className="hidden md:flex items-center gap-1 flex-1">
      {entries.map((entry) => {
        if (isGroup(entry)) {
          return <NavGroupDropdown key={entry.label} group={entry} pathname={pathname} />;
        }
        return (
          <Link key={entry.href} href={entry.href}>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'gap-2',
                pathname === entry.href && 'bg-accent text-accent-foreground'
              )}
            >
              <entry.icon className="h-4 w-4" />
              {entry.label}
            </Button>
          </Link>
        );
      })}
    </nav>
  );
}

/* ─── 모바일: 프로필/설정 섹션 ─── */
function MobileSettingsSection({ isAdmin, onNavigate }: { isAdmin: boolean; onNavigate: () => void }) {
  return (
    <div className="border-t pt-2 mt-2">
      <Link href="/profile" onClick={onNavigate}>
        <Button variant="ghost" className="w-full justify-start gap-2">
          <User className="h-4 w-4" />
          내 정보 수정
        </Button>
      </Link>
      {isAdmin && ADMIN_SETTINGS_LINKS.map((item) => (
        <Link key={item.href} href={item.href} onClick={onNavigate}>
          <Button variant="ghost" className="w-full justify-start gap-2">
            <item.icon className="h-4 w-4" />
            {item.label}
          </Button>
        </Link>
      ))}
    </div>
  );
}

/* ─── 모바일: 메뉴 그룹 항목 ─── */
function MobileNavGroup({ group, pathname, onNavigate }: { group: MenuGroup; pathname: string; onNavigate: () => void }) {
  return (
    <div>
      <Link href={group.items[0].href} onClick={onNavigate}>
        <p className="px-4 pt-3 pb-1 text-xs font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors cursor-pointer">
          {group.items[0].label}
        </p>
      </Link>
      {group.items.slice(1).map((item) => (
        <Link key={item.href} href={item.href} onClick={onNavigate}>
          <Button
            variant="ghost"
            className={cn('w-full justify-start gap-2 pl-8', pathname === item.href && 'bg-accent text-accent-foreground')}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Button>
        </Link>
      ))}
    </div>
  );
}

/* ─── 모바일 네비게이션 ─── */
function MobileNav({
  entries, pathname, onNavigate, isAdmin,
}: {
  entries: NavEntry[]; pathname: string; onNavigate: () => void; isAdmin: boolean;
}) {
  return (
    <nav className="md:hidden border-t p-4 space-y-1 bg-background">
      {entries.map((entry) => {
        if (isGroup(entry)) {
          return <MobileNavGroup key={entry.label} group={entry} pathname={pathname} onNavigate={onNavigate} />;
        }
        return (
          <Link key={entry.href} href={entry.href} onClick={onNavigate}>
            <Button
              variant="ghost"
              className={cn('w-full justify-start gap-2', pathname === entry.href && 'bg-accent text-accent-foreground')}
            >
              <entry.icon className="h-4 w-4" />
              {entry.label}
            </Button>
          </Link>
        );
      })}
      <MobileSettingsSection isAdmin={isAdmin} onNavigate={onNavigate} />
    </nav>
  );
}

/* ─── 유저 드롭다운 메뉴 ─── */
function UserDropdown({
  user, onLogout,
}: {
  user: { company_name: string; email: string; is_admin: boolean; business_number: string };
  onLogout: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Avatar className="h-7 w-7">
            <AvatarFallback className="text-xs">{user.company_name.charAt(0)}</AvatarFallback>
          </Avatar>
          <span className="hidden sm:inline max-w-[150px] truncate">{user.company_name}</span>
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
        {user.is_admin && ADMIN_SETTINGS_LINKS.map((item) => (
          <DropdownMenuItem key={item.href} asChild>
            <Link href={item.href} className="cursor-pointer">
              <item.icon className="mr-2 h-4 w-4" />
              {item.label}
            </Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuItem disabled className="text-muted-foreground">
          <span className="mr-2 h-4 w-4" />
          {user.is_admin ? '관리자' : '업체'} ({user.business_number})
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onLogout} className="text-red-600 cursor-pointer">
          <LogOut className="mr-2 h-4 w-4" />
          로그아웃
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ─── Header ─── */
export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isMounted, clearUser } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      clearUser();
      await fetch(API_ROUTES.AUTH.LOGOUT, { method: 'POST' });
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      router.push('/login');
    }
  };

  if (!isMounted || !user) {
    return (
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center max-w-screen-xl mx-auto w-full px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2 mr-6">
            <FileSpreadsheet className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg hidden sm:inline">CSO Portal</span>
          </Link>
          <div className="flex-1" />
          {isMounted && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
        </div>
      </header>
    );
  }

  const navEntries = user.is_admin ? ADMIN_NAV : USER_NAV;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center max-w-screen-xl mx-auto w-full px-4 sm:px-6 lg:px-8">
        <Link href={user.is_admin ? '/admin' : '/home'} className="flex items-center gap-2 mr-6">
          <FileSpreadsheet className="h-6 w-6 text-primary" />
          <span className="font-bold text-lg hidden sm:inline">CSO Portal</span>
        </Link>
        <DesktopNav entries={navEntries} pathname={pathname} />
        <div className="flex items-center gap-2 ml-auto">
          <UserDropdown user={user} onLogout={handleLogout} />
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>
      {mobileMenuOpen && (
        <MobileNav entries={navEntries} pathname={pathname} onNavigate={() => setMobileMenuOpen(false)} isAdmin={user.is_admin} />
      )}
    </header>
  );
}
