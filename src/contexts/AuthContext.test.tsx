import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';

// localStorage mock
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

function TestConsumer() {
  const { user, isMounted, isAuthenticated, setUser, clearUser } = useAuth();
  return (
    <div>
      <span data-testid="mounted">{String(isMounted)}</span>
      <span data-testid="authenticated">{String(isAuthenticated)}</span>
      <span data-testid="user">{user ? user.company_name : 'none'}</span>
      <button onClick={() => setUser({
        id: 'test-1',
        business_number: '1234567890',
        company_name: '테스트회사',
        email: 'test@test.com',
        is_admin: false,
        is_approved: true,
        must_change_password: false,
        profile_complete: true,
      })}>
        login
      </button>
      <button onClick={clearUser}>logout</button>
    </div>
  );
}

beforeEach(() => {
  localStorageMock.clear();
});

describe('AuthContext', () => {
  it('초기 상태에서 user는 null이다', () => {
    render(
      <AuthProvider><TestConsumer /></AuthProvider>
    );
    expect(screen.getByTestId('user').textContent).toBe('none');
    expect(screen.getByTestId('authenticated').textContent).toBe('false');
  });

  it('마운트 완료 후 isMounted가 true가 된다', async () => {
    render(
      <AuthProvider><TestConsumer /></AuthProvider>
    );
    // useEffect 실행 후
    expect(screen.getByTestId('mounted').textContent).toBe('true');
  });

  it('setUser 호출 시 상태와 localStorage가 업데이트된다', async () => {
    render(
      <AuthProvider><TestConsumer /></AuthProvider>
    );

    await act(async () => {
      screen.getByText('login').click();
    });

    expect(screen.getByTestId('user').textContent).toBe('테스트회사');
    expect(screen.getByTestId('authenticated').textContent).toBe('true');
    expect(localStorageMock.getItem('cso_auth_user')).toContain('테스트회사');
  });

  it('clearUser 호출 시 상태와 localStorage가 초기화된다', async () => {
    render(
      <AuthProvider><TestConsumer /></AuthProvider>
    );

    await act(async () => {
      screen.getByText('login').click();
    });
    expect(screen.getByTestId('authenticated').textContent).toBe('true');

    await act(async () => {
      screen.getByText('logout').click();
    });

    expect(screen.getByTestId('user').textContent).toBe('none');
    expect(screen.getByTestId('authenticated').textContent).toBe('false');
    expect(localStorageMock.getItem('cso_auth_user')).toBeNull();
  });

  it('localStorage에 저장된 세션이 있으면 복원한다', () => {
    localStorageMock.setItem('cso_auth_user', JSON.stringify({
      id: 'stored-1',
      business_number: '1234567890',
      company_name: '저장된회사',
      email: 'stored@test.com',
      is_admin: false,
      is_approved: true,
      must_change_password: false,
      profile_complete: true,
    }));

    render(
      <AuthProvider><TestConsumer /></AuthProvider>
    );

    // useEffect로 복원되므로 바로 반영
    expect(screen.getByTestId('user').textContent).toBe('저장된회사');
  });

  it('잘못된 localStorage 데이터는 무시하고 삭제한다', () => {
    localStorageMock.setItem('cso_auth_user', 'invalid-json');

    render(
      <AuthProvider><TestConsumer /></AuthProvider>
    );

    expect(screen.getByTestId('user').textContent).toBe('none');
    expect(localStorageMock.getItem('cso_auth_user')).toBeNull();
  });

  it('필수 필드가 누락된 localStorage 데이터는 무시한다', () => {
    localStorageMock.setItem('cso_auth_user', JSON.stringify({ id: 'test' }));

    render(
      <AuthProvider><TestConsumer /></AuthProvider>
    );

    expect(screen.getByTestId('user').textContent).toBe('none');
  });

  it('useAuth를 Provider 없이 사용하면 에러를 던진다', () => {
    // console.error를 숨김
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow('useAuth must be used within an AuthProvider');
    spy.mockRestore();
  });
});
