import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// 테스트 간 DOM 정리
afterEach(() => {
  cleanup();
});

// 테스트 환경변수
process.env.JWT_SECRET = 'test-jwt-secret-key-for-vitest';
// NODE_ENV는 vitest가 자동 설정하므로 수동 할당 불필요
