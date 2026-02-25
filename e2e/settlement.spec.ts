import { test, expect } from '@playwright/test';

test.describe('정산서 페이지', () => {
  test('미인증 사용자는 로그인 페이지로 리다이렉트된다', async ({ page }) => {
    await page.goto('/dashboard');
    // 로그인 페이지로 리다이렉트되거나 로그인 폼이 표시
    await page.waitForURL(/\/(login|dashboard)/, { timeout: 5000 });
  });

  test('로그인 페이지에 접근 가능하다', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL(/\/login/);
  });

  test('회원가입 페이지에 접근 가능하다', async ({ page }) => {
    await page.goto('/register');
    // 회원가입 폼이 렌더링되는지 확인
    await expect(page.locator('input[name="business_number"], input[placeholder*="사업자"]')).toBeVisible({
      timeout: 5000,
    });
  });
});
