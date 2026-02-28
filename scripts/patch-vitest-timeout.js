/**
 * WSL2 + OneDrive 환경에서 Vitest worker 초기화 타임아웃 패치
 * Vitest 4의 하드코딩된 START_TIMEOUT(60s), WORKER_START_TIMEOUT(90s)을
 * 300s로 증가시켜 느린 파일 I/O 환경에서도 안정적으로 동작하도록 합니다.
 */
const fs = require('fs');
const path = require('path');

const target = path.join(
  __dirname,
  '..',
  'node_modules',
  'vitest',
  'dist',
  'chunks',
  'cli-api.B7PN_QUv.js'
);

if (!fs.existsSync(target)) {
  // 파일명이 변경될 수 있으므로 glob 패턴으로 탐색
  const dir = path.join(__dirname, '..', 'node_modules', 'vitest', 'dist', 'chunks');
  if (!fs.existsSync(dir)) process.exit(0);
  const files = fs.readdirSync(dir).filter((f) => f.startsWith('cli-api.') && f.endsWith('.js'));
  for (const file of files) {
    patchFile(path.join(dir, file));
  }
} else {
  patchFile(target);
}

function patchFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let patched = false;

  if (content.includes('const START_TIMEOUT = 6e4;')) {
    content = content.replace('const START_TIMEOUT = 6e4;', 'const START_TIMEOUT = 3e5;');
    patched = true;
  }
  if (content.includes('const WORKER_START_TIMEOUT = 9e4;')) {
    content = content.replace('const WORKER_START_TIMEOUT = 9e4;', 'const WORKER_START_TIMEOUT = 3e5;');
    patched = true;
  }

  if (patched) {
    fs.writeFileSync(filePath, content);
    console.log(`[patch-vitest-timeout] Patched: ${path.basename(filePath)}`);
  }
}
