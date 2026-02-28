import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/admin',
}));

// Mock AuthContext
const mockUseAuth = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

import { Header } from './header';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Header', () => {
  it('마운트 전에는 로딩 상태를 표시한다', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isMounted: false,
      clearUser: vi.fn(),
    });

    render(<Header />);

    expect(screen.getByText('CSO Portal')).toBeInTheDocument();
    // 사용자 메뉴가 없음
    expect(screen.queryByText('로그아웃')).not.toBeInTheDocument();
  });

  it('마운트 후 user가 없으면 로딩 스피너를 표시한다', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isMounted: true,
      clearUser: vi.fn(),
    });

    render(<Header />);

    // Loader2 아이콘이 렌더링됨 (animate-spin 클래스)
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('관리자 사용자면 관리자 메뉴를 표시한다', () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: 'admin-1',
        business_number: '1234567890',
        company_name: '관리자회사',
        email: 'admin@test.com',
        is_admin: true,
        is_approved: true,
      },
      isMounted: true,
      clearUser: vi.fn(),
    });

    render(<Header />);

    expect(screen.getByText('관리자회사')).toBeInTheDocument();
    expect(screen.getByText('대시보드')).toBeInTheDocument();
    // 그룹 드롭다운은 첫 번째 항목 라벨을 버튼으로 표시
    expect(screen.getByText('정산서 업로드')).toBeInTheDocument();
  });

  it('일반 사용자면 일반 메뉴를 표시한다', () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: 'user-1',
        business_number: '9876543210',
        company_name: '일반회사',
        email: 'user@test.com',
        is_admin: false,
        is_approved: true,
      },
      isMounted: true,
      clearUser: vi.fn(),
    });

    render(<Header />);

    expect(screen.getByText('일반회사')).toBeInTheDocument();
    expect(screen.getByText('정산서 조회')).toBeInTheDocument();
    expect(screen.getByText('월별 합계')).toBeInTheDocument();
    // 관리자 메뉴는 미표시
    expect(screen.queryByText('정산서 업로드')).not.toBeInTheDocument();
  });
});
