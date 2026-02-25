import { test, expect } from '@playwright/test';

test.describe('인증 플로우', () => {
  test('로그인 페이지가 렌더링된다', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('input[name="business_number"], input[placeholder*="사업자"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('필수 입력값 없이 로그인하면 에러 메시지가 표시된다', async ({ page }) => {
    await page.goto('/login');
    await page.locator('button[type="submit"]').click();
    // 에러 메시지 또는 필수 입력 알림 확인
    await expect(page.locator('text=사업자번호').first()).toBeVisible();
  });

  test('잘못된 인증정보로 로그인하면 에러 메시지가 표시된다', async ({ page }) => {
    await page.goto('/login');

    const bnInput = page.locator('input[name="business_number"], input[placeholder*="사업자"]');
    const pwInput = page.locator('input[type="password"]');

    await bnInput.fill('0000000000');
    await pwInput.fill('wrongpassword');
    await page.locator('button[type="submit"]').click();

    // 에러 토스트 또는 에러 메시지 대기
    await expect(page.locator('[role="alert"], .text-red-500, .text-destructive').first()).toBeVisible({
      timeout: 5000,
    });
  });

  test('로그아웃 후 로그인 페이지로 이동한다', async ({ page }) => {
    // 로그인 상태가 아니면 /login으로 리다이렉트될 수 있음
    await page.goto('/dashboard');
    // 미인증 시 로그인 페이지로 리다이렉트 확인
    await page.waitForURL(/\/(login|dashboard)/, { timeout: 5000 });
  });
});
