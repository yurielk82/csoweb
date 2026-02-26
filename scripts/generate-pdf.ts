/**
 * GitHub 스타일 PDF 생성 스크립트
 *
 * 사용법: npx tsx scripts/generate-pdf.ts
 *
 * 의존성: marked, github-markdown-css, @playwright/test (모두 devDependencies)
 * Playwright 브라우저가 설치되어 있어야 합니다 (npx playwright install chromium)
 */

import { chromium } from 'playwright';
import { marked, type Tokens } from 'marked';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// --- slug 생성 (GitHub 방식) ---

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/<[^>]*>/g, '')           // HTML 태그 제거
    .replace(/[^\w\s가-힣-]/g, '')     // 특수문자 제거 (한글 유지)
    .replace(/\s+/g, '-')             // 공백 → 하이픈
    .replace(/-+/g, '-')              // 중복 하이픈 제거
    .replace(/^-|-$/g, '');           // 양 끝 하이픈 제거
}

// --- 설정 ---

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const VERSION = 'v0.16.0';
const DATE = '2026-02-26';
const CONTACT = '영업관리팀 권대환 — qwer@ukp.co.kr';

// 문서 순서 (전산팀 이관 전달용)
const DOCS: Array<{ path: string; title: string }> = [
  { path: 'README.md', title: 'CSO 정산 포털' },
  { path: 'docs/MIGRATION.md', title: '이관 매뉴얼' },
  { path: 'docs/ONBOARDING.md', title: '온보딩 가이드' },
  { path: 'docs/OPERATIONS.md', title: '배포 & 운영' },
  { path: 'docs/ARCHITECTURE.md', title: '아키텍처' },
  { path: 'docs/API-DATABASE.md', title: 'API & 데이터베이스 레퍼런스' },
  { path: 'docs/API_REFERENCE.md', title: 'API Reference (외부/내부)' },
  { path: 'CHANGELOG.md', title: 'Changelog' },
];

// shields.io 배지 → HTML 라벨 (이미지 대신 텍스트 배지)
const BADGE_MAP: Record<string, { label: string; bg: string; fg: string }> = {
  'nextjs-shield': { label: 'Next.js', bg: '#24292f', fg: '#ffffff' },
  'typescript-shield': { label: 'TypeScript', bg: '#3178C6', fg: '#ffffff' },
  'supabase-shield': { label: 'Supabase', bg: '#3FCF8E', fg: '#ffffff' },
  'tailwind-shield': { label: 'Tailwind CSS', bg: '#06B6D4', fg: '#ffffff' },
  'netlify-shield': { label: 'Netlify', bg: '#00C7B7', fg: '#ffffff' },
};

// --- 마크다운 전처리 ---

function resolveReferenceLinks(text: string): string {
  // 레퍼런스 정의 수집
  const refs: Record<string, string> = {};
  for (const m of text.matchAll(/^\[([^\]]+)\]:\s*(.+)$/gm)) {
    refs[m[1].toLowerCase()] = m[2].trim();
  }

  // [![alt][img-ref]][link-ref] → 배지 HTML 또는 텍스트 링크
  text = text.replace(
    /\[!\[([^\]]*)\]\[([^\]]+)\]\]\[([^\]]+)\]/g,
    (_match, _alt: string, imgRef: string, linkRef: string) => {
      const imgKey = imgRef.toLowerCase();
      for (const [key, badge] of Object.entries(BADGE_MAP)) {
        if (key === imgKey || imgKey.includes(key)) {
          return `<span class="badge" style="background:${badge.bg};color:${badge.fg};display:inline-block;padding:3px 10px;border-radius:6px;font-weight:600;font-size:8.5pt;margin:2px 3px">${badge.label}</span>`;
        }
      }
      const url = refs[linkRef.toLowerCase()] || '#';
      return `[${_alt}](${url})`;
    }
  );

  // 남은 [text][ref] → 인라인 링크
  text = text.replace(/\[([^\]]+)\]\[([^\]]+)\]/g, (_match, linkText: string, refKey: string) => {
    const url = refs[refKey.toLowerCase()];
    return url ? `[${linkText}](${url})` : _match;
  });

  // 레퍼런스 정의 라인 제거
  text = text.replace(/^\[([^\]]+)\]:\s*.+$/gm, '');

  return text;
}

function preprocessMarkdown(text: string): string {
  text = resolveReferenceLinks(text);

  // 체크박스
  text = text.replace(/- \[x\] /g, '- <input type="checkbox" checked disabled> ');
  text = text.replace(/- \[ \] /g, '- <input type="checkbox" disabled> ');

  // HTML 주석 제거
  text = text.replace(/<!--.*?-->/gs, '');

  // GitHub "맨 위로" 링크 제거
  text = text.replace(/<p align="right">.*?<\/p>/gs, '');

  // <a id="..."></a> 앵커 제거
  text = text.replace(/<a\s+id="[^"]*"\s*>\s*<\/a>/g, '');

  return text;
}

// --- HTML 조립 ---

function buildCoverPage(): string {
  const badges = Object.values(BADGE_MAP)
    .map(b => `<span class="badge" style="background:${b.bg};color:${b.fg}">${b.label}</span>`)
    .join(' ');

  return `
  <div class="cover-page">
    <h1>CSO 정산 포털</h1>
    <div class="version">${VERSION}</div>
    <div class="subtitle">
      CSO(위탁영업) 업체가 제약사 정산 수수료를 조회하는 B2B 포털<br>
      기술 문서 통합본
    </div>
    <div class="badges">${badges}</div>
    <div class="meta">${DATE} 기준</div>
    <div class="contact">${CONTACT}</div>
  </div>`;
}

function buildToc(): string {
  const items = DOCS.map(
    (d, i) => `<li><a href="#${docPrefix(d.path)}"><span class="toc-num">${i + 1}.</span> ${d.title}</a></li>`
  ).join('\n');

  return `
  <div class="toc-page">
    <h1>목차</h1>
    <ol>${items}</ol>
  </div>`;
}

// 문서 파일명 → 앵커 프리픽스 (문서 간 링크용)
function docPrefix(docPath: string): string {
  // "docs/MIGRATION.md" → "migration", "README.md" → "readme"
  return docPath.replace(/^docs\//, '').replace(/\.md$/i, '').toLowerCase();
}

// 문서 간 상대 링크를 PDF 내부 앵커로 변환
// 예: [ONBOARDING.md](ONBOARDING.md) → <a href="#onboarding">
//     [API-DATABASE.md#스키마](API-DATABASE.md#스키마) → <a href="#api-database-스키마">
function rewriteDocLinks(html: string): string {
  // href="docs/FILE.md#section" 또는 href="FILE.md#section" 또는 href="FILE.md"
  return html.replace(
    /href="(?:docs\/)?([A-Za-z0-9_-]+)\.md(?:#([^"]*))?" /g,
    (_match, file: string, fragment: string | undefined) => {
      const prefix = file.toLowerCase();
      if (fragment) {
        return `href="#${prefix}-${fragment}"`;
      }
      return `href="#${prefix}"`;
    }
  );
}

async function buildChapter(doc: typeof DOCS[0], index: number): Promise<string> {
  const fullPath = resolve(PROJECT_ROOT, doc.path);
  let md: string;
  try {
    md = readFileSync(fullPath, 'utf-8');
  } catch {
    console.log(`  [SKIP] ${doc.path} not found`);
    return '';
  }

  md = preprocessMarkdown(md);

  // 첫 번째 h1 제거 (chapter-header와 중복 방지)
  md = md.replace(/^#\s+.+$/m, '');

  const prefix = docPrefix(doc.path);

  // marked에 heading renderer를 설정하여 id 속성 부여
  const renderer = new marked.Renderer();
  renderer.heading = function ({ text, depth }: Tokens.Heading) {
    const slug = slugify(text);
    const id = `${prefix}-${slug}`;
    return `<h${depth} id="${id}"><a href="#${id}">${text}</a></h${depth}>`;
  };

  let html = await marked.parse(md, { gfm: true, breaks: false, renderer });

  // 문서 간 .md 링크를 PDF 내부 앵커로 변환
  html = rewriteDocLinks(html);

  console.log(`  [OK] ${doc.path}`);
  return `
  <div class="chapter" id="${prefix}">
    <div class="chapter-header">
      <span class="chapter-num">Chapter ${index + 1}</span>
      <h1>${doc.title}</h1>
    </div>
    <div class="markdown-body">
      ${html}
    </div>
  </div>`;
}

function getGitHubCSS(): string {
  const cssPath = resolve(PROJECT_ROOT, 'node_modules/github-markdown-css/github-markdown-light.css');
  return readFileSync(cssPath, 'utf-8');
}

// --- 메인 ---

async function main() {
  console.log('\n  GitHub 스타일 PDF 생성 시작...\n');

  const githubCSS = getGitHubCSS();

  const chapters: string[] = [];
  for (let i = 0; i < DOCS.length; i++) {
    const html = await buildChapter(DOCS[i], i);
    if (html) chapters.push(html);
  }

  const fullHTML = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <style>
    /* GitHub Markdown CSS */
    ${githubCSS}

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans KR",
                   "Malgun Gothic", Helvetica, Arial, sans-serif;
      color: #1f2328;
      background: #ffffff;
    }

    .markdown-body {
      font-size: 10pt;
      line-height: 1.6;
      max-width: none;
      padding: 0;
    }

    .markdown-body table {
      font-size: 9pt;
    }

    .markdown-body pre {
      font-size: 8.5pt;
    }

    .markdown-body code {
      font-family: "D2Coding", ui-monospace, SFMono-Regular, "SF Mono",
                   Menlo, Consolas, "Liberation Mono", monospace;
    }

    /* 표지 */
    .cover-page {
      text-align: center;
      padding-top: 150px;
      page-break-after: always;
    }
    .cover-page h1 {
      font-size: 34pt;
      font-weight: 700;
      color: #1f2328;
      border: none;
      margin-bottom: 8px;
    }
    .cover-page .version {
      font-size: 14pt;
      color: #656d76;
      font-family: ui-monospace, SFMono-Regular, monospace;
      margin-bottom: 24px;
    }
    .cover-page .subtitle {
      font-size: 12pt;
      color: #656d76;
      line-height: 1.8;
      margin-bottom: 40px;
    }
    .cover-page .badges {
      margin: 24px 0;
    }
    .cover-page .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 6px;
      font-weight: 600;
      font-size: 9pt;
      margin: 3px;
    }
    .cover-page .meta {
      font-size: 10pt;
      color: #656d76;
      margin-top: 40px;
    }
    .cover-page .contact {
      font-size: 9pt;
      color: #656d76;
      margin-top: 16px;
    }

    /* 목차 */
    .toc-page {
      page-break-after: always;
    }
    .toc-page h1 {
      font-size: 20pt;
      font-weight: 600;
      border-bottom: 1px solid #d1d9e0;
      padding-bottom: 0.3em;
      margin-bottom: 24px;
    }
    .toc-page ol {
      list-style: none;
      padding: 0;
      counter-reset: none;
    }
    .toc-page li {
      padding: 10px 16px;
      border-bottom: 1px solid #d1d9e0;
      font-size: 11pt;
      color: #1f2328;
    }
    .toc-page .toc-num {
      display: inline-block;
      width: 2em;
      color: #656d76;
      font-weight: 600;
    }
    .toc-page a {
      color: #1f2328;
      text-decoration: none;
      display: block;
    }
    .toc-page a:hover {
      color: #0969da;
    }

    /* 각 챕터 */
    .chapter {
      page-break-before: always;
    }
    .chapter-header {
      background: #f6f8fa;
      border: 1px solid #d1d9e0;
      border-radius: 6px;
      padding: 16px 24px;
      margin-bottom: 24px;
    }
    .chapter-header h1 {
      font-size: 22pt;
      font-weight: 600;
      margin: 0;
      padding: 0;
      border: none;
      color: #1f2328;
    }
    .chapter-header .chapter-num {
      font-size: 9pt;
      color: #656d76;
      display: block;
      margin-bottom: 4px;
    }

    /* heading 내부 앵커 링크 */
    .markdown-body h1 a,
    .markdown-body h2 a,
    .markdown-body h3 a,
    .markdown-body h4 a {
      color: inherit;
      text-decoration: none;
    }

    /* 배지 (본문 내) */
    .badge {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 6px;
      font-weight: 600;
      font-size: 8.5pt;
      margin: 2px 3px;
      white-space: nowrap;
    }

    /* 체크박스 */
    input[type="checkbox"] {
      margin-right: 4px;
      vertical-align: middle;
    }

    /* details/summary */
    details {
      border: 1px solid #d1d9e0;
      border-radius: 6px;
      padding: 8px 16px;
      margin: 8px 0;
    }
    summary {
      font-weight: 600;
      cursor: pointer;
    }
  </style>
</head>
<body>
  ${buildCoverPage()}
  ${buildToc()}
  ${chapters.join('\n')}
</body>
</html>`;

  // Playwright로 PDF 렌더링
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.setContent(fullHTML, { waitUntil: 'networkidle' });

  const outputPath = resolve(PROJECT_ROOT, 'CSO_정산포털_기술문서.pdf');
  await page.pdf({
    path: outputPath,
    format: 'A4',
    margin: { top: '20mm', bottom: '20mm', left: '18mm', right: '18mm' },
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: '<span></span>',
    footerTemplate: `
      <div style="width:100%;text-align:center;font-size:8pt;color:#656d76;font-family:sans-serif;">
        CSO 정산 포털 — 기술 문서 &nbsp;|&nbsp; <span class="pageNumber"></span> / <span class="totalPages"></span>
      </div>
    `,
  });

  await browser.close();

  const { statSync } = await import('fs');
  const size = statSync(outputPath).size;
  console.log(`\n  PDF 생성 완료: ${outputPath}`);
  console.log(`  파일 크기: ${(size / 1024).toFixed(0)} KB\n`);
}

main().catch((err) => {
  console.error('PDF 생성 실패:', err);
  process.exit(1);
});
