import '@testing-library/jest-dom';

// 테스트 환경변수
process.env.JWT_SECRET = 'test-jwt-secret-key-for-vitest';
process.env.NODE_ENV = 'test';
