import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// 테스트 간 DOM 정리
afterEach(() => {
  cleanup();
});

// 테스트 환경변수
process.env.JWT_SECRET = 'test-jwt-secret-key-for-vitest';
process.env.NODE_ENV = 'test';
