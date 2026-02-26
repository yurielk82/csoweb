#!/usr/bin/env python3
"""모든 문서를 하나의 PDF로 병합 출력 (GitHub 스타일)"""

# fonttools unicode range bug 우회 (bit 123 > max 122)
import fontTools.ttLib.tables.O_S_2f_2 as _os2
_orig_setUnicodeRanges = _os2.table_O_S_2f_2.setUnicodeRanges
def _patched_setUnicodeRanges(self, bits):
    bits = {b for b in bits if b <= 122}
    _orig_setUnicodeRanges(self, bits)
_os2.table_O_S_2f_2.setUnicodeRanges = _patched_setUnicodeRanges

import markdown
from weasyprint import HTML
from pathlib import Path
import re

PROJECT_ROOT = Path(__file__).resolve().parent.parent

# 문서 순서 정의 (전산팀 이관 전달용: 개요 → 이관 → 환경 → 운영 → 설계 → 참조)
DOCS = [
    ("README.md", "CSO 정산 포털"),
    ("docs/MIGRATION.md", "이관 매뉴얼"),
    ("docs/ONBOARDING.md", "온보딩 가이드"),
    ("docs/OPERATIONS.md", "배포 & 운영"),
    ("docs/ARCHITECTURE.md", "아키텍처"),
    ("docs/API-DATABASE.md", "API & 데이터베이스 레퍼런스"),
    ("docs/API_REFERENCE.md", "API Reference (외부/내부)"),
    ("CHANGELOG.md", "Changelog"),
]

# shields.io 배지 → 텍스트 치환 (이미지 깨짐 방지)
BADGE_MAP = {
    "nextjs-shield": ("Next.js", "#24292f", "#ffffff"),
    "typescript-shield": ("TypeScript", "#3178C6", "#ffffff"),
    "supabase-shield": ("Supabase", "#3FCF8E", "#ffffff"),
    "tailwind-shield": ("Tailwind CSS", "#06B6D4", "#ffffff"),
    "netlify-shield": ("Netlify", "#00C7B7", "#ffffff"),
}

# GitHub 스타일 CSS
CSS = """
@page {
    size: A4;
    margin: 20mm 18mm 20mm 18mm;
    @bottom-center {
        content: "CSO 정산 포털 — 기술 문서  |  페이지 " counter(page) " / " counter(pages);
        font-size: 8pt;
        color: #656d76;
    }
}

body {
    font-family: "Noto Sans KR", -apple-system, BlinkMacSystemFont, "Segoe UI",
                 "Malgun Gothic", "맑은 고딕", Helvetica, Arial, sans-serif;
    font-size: 10pt;
    line-height: 1.6;
    color: #1f2328;
    word-wrap: break-word;
}

/* 장 구분 */
.chapter {
    page-break-before: always;
}
.chapter:first-child {
    page-break-before: avoid;
}

/* GitHub 스타일 헤딩 */
h1 {
    font-size: 20pt;
    font-weight: 600;
    color: #1f2328;
    border-bottom: 1px solid #d1d9e0;
    padding-bottom: 0.3em;
    margin-top: 24px;
    margin-bottom: 16px;
}
h2 {
    font-size: 15pt;
    font-weight: 600;
    color: #1f2328;
    border-bottom: 1px solid #d1d9e0;
    padding-bottom: 0.3em;
    margin-top: 24px;
    margin-bottom: 16px;
}
h3 {
    font-size: 12pt;
    font-weight: 600;
    color: #1f2328;
    margin-top: 24px;
    margin-bottom: 16px;
}
h4 {
    font-size: 10.5pt;
    font-weight: 600;
    color: #1f2328;
    margin-top: 24px;
    margin-bottom: 16px;
}

/* GitHub 스타일 테이블 */
table {
    border-collapse: collapse;
    border-spacing: 0;
    width: 100%;
    margin: 8px 0 16px 0;
    font-size: 9pt;
    display: table;
    overflow: auto;
}
th, td {
    border: 1px solid #d1d9e0;
    padding: 6px 13px;
    text-align: left;
    word-break: break-word;
}
th {
    background-color: #f6f8fa;
    font-weight: 600;
}
tr:nth-child(even) {
    background-color: #f6f8fa;
}
tr:nth-child(odd) {
    background-color: #ffffff;
}

/* GitHub 스타일 인라인 코드 */
code {
    background-color: rgba(175, 184, 193, 0.2);
    padding: 0.2em 0.4em;
    border-radius: 6px;
    font-size: 85%;
    font-family: "D2Coding", ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
}

/* GitHub 스타일 코드 블록 */
pre {
    background-color: #f6f8fa;
    padding: 16px;
    border-radius: 6px;
    border: 1px solid #d1d9e0;
    overflow-x: auto;
    font-size: 8.5pt;
    line-height: 1.45;
    margin: 0 0 16px 0;
}
pre code {
    background: none;
    padding: 0;
    border-radius: 0;
    font-size: 100%;
}

/* GitHub 스타일 인용 */
blockquote {
    border-left: 0.25em solid #d1d9e0;
    margin: 0 0 16px 0;
    padding: 0 1em;
    color: #656d76;
}
blockquote p {
    margin: 0;
}

/* GitHub 스타일 링크 */
a {
    color: #0969da;
    text-decoration: none;
}

/* 배지 스타일 */
.badge {
    display: inline-block;
    padding: 3px 10px;
    border-radius: 6px;
    color: white;
    font-weight: 600;
    font-size: 8.5pt;
    margin: 2px 3px;
    white-space: nowrap;
}

/* 리스트 */
ul, ol {
    padding-left: 2em;
    margin: 0 0 16px 0;
}
li {
    margin: 4px 0;
}
li + li {
    margin-top: 4px;
}

/* details/summary */
details {
    margin: 8px 0;
}
summary {
    cursor: pointer;
    font-weight: 600;
}

/* GitHub 스타일 구분선 */
hr {
    border: none;
    border-top: 1px solid #d1d9e0;
    margin: 24px 0;
    height: 0.25em;
    background-color: #d1d9e0;
    border: 0;
    border-radius: 2px;
}

/* 강조 */
strong {
    font-weight: 600;
}

/* 표지 스타일 */
.cover {
    text-align: center;
    padding-top: 160px;
}
.cover h1 {
    font-size: 32pt;
    border: none;
    color: #1f2328;
    margin-bottom: 8px;
}
.cover .version {
    font-size: 14pt;
    color: #656d76;
    margin-bottom: 24px;
    font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
}
.cover .subtitle {
    font-size: 12pt;
    color: #656d76;
    margin-bottom: 48px;
    line-height: 1.6;
}
.cover .date {
    font-size: 10pt;
    color: #656d76;
}
.cover .badges {
    margin: 24px 0;
}
.cover .info {
    margin-top: 40px;
    color: #656d76;
    font-size: 9pt;
}

/* 목차 스타일 */
.toc h1 {
    font-size: 18pt;
}
.toc ol {
    list-style: none;
    padding-left: 0;
    counter-reset: toc-counter;
}
.toc li {
    padding: 8px 12px;
    border-bottom: 1px solid #d1d9e0;
    counter-increment: toc-counter;
    font-size: 11pt;
}
.toc li::before {
    content: counter(toc-counter) ". ";
    color: #656d76;
    font-weight: 600;
}
.toc a {
    text-decoration: none;
    color: #1f2328;
}

/* 장 헤더 */
.chapter-header {
    background-color: #f6f8fa;
    border: 1px solid #d1d9e0;
    border-radius: 6px;
    padding: 16px 24px;
    margin-bottom: 24px;
}
.chapter-header h1 {
    border: none;
    margin: 0;
    padding: 0;
    font-size: 22pt;
}
.chapter-header .chapter-num {
    color: #656d76;
    font-size: 10pt;
    font-weight: 400;
    margin-bottom: 4px;
}
"""


def resolve_reference_links(text: str) -> str:
    """마크다운 레퍼런스 링크를 배지 HTML 또는 인라인 링크로 변환"""
    # 1단계: 레퍼런스 정의 수집
    refs = {}
    for m in re.finditer(r'^\[([^\]]+)\]:\s*(.+)$', text, re.MULTILINE):
        refs[m.group(1).lower()] = m.group(2).strip()

    # 2단계: [![alt][img-ref]][link-ref] 패턴 → 배지 HTML 또는 인라인 링크
    def replace_nested_image_link(m):
        alt_text = m.group(1)
        img_ref = m.group(2).lower()
        link_ref = m.group(3).lower()

        # BADGE_MAP에서 매칭 시도
        for key, (label, bg, fg) in BADGE_MAP.items():
            if key == img_ref or key in img_ref:
                return f'<span class="badge" style="background-color:{bg};color:{fg}">{label}</span>'

        # 매칭 실패 시 텍스트로 대체
        link_url = refs.get(link_ref, "#")
        return f'<a href="{link_url}">{alt_text}</a>'

    text = re.sub(
        r'\[!\[([^\]]*)\]\[([^\]]+)\]\]\[([^\]]+)\]',
        replace_nested_image_link,
        text
    )

    # 3단계: 남은 [text][ref] 패턴 → 인라인 링크
    def replace_ref_link(m):
        text_part = m.group(1)
        ref_key = m.group(2).lower()
        url = refs.get(ref_key, "")
        if url:
            return f'[{text_part}]({url})'
        return m.group(0)

    text = re.sub(r'\[([^\]]+)\]\[([^\]]+)\]', replace_ref_link, text)

    # 4단계: 레퍼런스 정의 라인 제거
    text = re.sub(r'^\[([^\]]+)\]:\s*.+$', '', text, flags=re.MULTILINE)

    return text


def process_checkboxes(text: str) -> str:
    """체크박스 마크다운을 HTML 체크박스로 변환"""
    text = text.replace("- [x] ", "- &#9745; ")
    text = text.replace("- [ ] ", "- &#9744; ")
    return text


def strip_html_comments(text: str) -> str:
    """HTML 주석 제거"""
    return re.sub(r'<!--.*?-->', '', text, flags=re.DOTALL)


def strip_github_anchors(text: str) -> str:
    """GitHub 전용 앵커 태그 제거"""
    text = re.sub(r'<a\s+id="[^"]*"\s*>\s*</a>', '', text)
    text = re.sub(r'<p\s+align="right">.*?</p>', '', text, flags=re.DOTALL)
    return text


def convert_md_to_html(md_text: str) -> str:
    """마크다운 → HTML 변환 (GitHub 스타일)"""
    md_text = resolve_reference_links(md_text)
    md_text = process_checkboxes(md_text)
    md_text = strip_html_comments(md_text)
    md_text = strip_github_anchors(md_text)

    # nl2br 제거 — GitHub은 단일 줄바꿈을 <br>로 변환하지 않음
    extensions = ['tables', 'fenced_code', 'codehilite', 'toc']
    html = markdown.markdown(md_text, extensions=extensions)
    return html


def build_cover_page() -> str:
    """표지 생성"""
    badges_html = ""
    for key, (label, bg, fg) in BADGE_MAP.items():
        badges_html += f'<span class="badge" style="background-color:{bg};color:{fg}">{label}</span> '

    return f"""
    <div class="cover">
        <h1>CSO 정산 포털</h1>
        <div class="version">v0.16.0</div>
        <div class="subtitle">
            CSO(위탁영업) 업체가 제약사 정산 수수료를 조회하는 B2B 포털<br>
            기술 문서 통합본
        </div>
        <div class="badges">{badges_html}</div>
        <div class="date">2026-02-26 기준</div>
        <div class="info">
            영업관리팀 권대환 — qwer@ukp.co.kr
        </div>
    </div>
    """


def build_toc() -> str:
    """목차 생성"""
    items = ""
    for i, (_, title) in enumerate(DOCS, 1):
        items += f'<li>{title}</li>\n'

    return f"""
    <div class="chapter toc">
        <h1>목차</h1>
        <ol>{items}</ol>
    </div>
    """


def main():
    html_parts = [build_cover_page(), build_toc()]

    for i, (filepath, title) in enumerate(DOCS, 1):
        full_path = PROJECT_ROOT / filepath
        if not full_path.exists():
            print(f"  [SKIP] {filepath} not found")
            continue

        md_text = full_path.read_text(encoding="utf-8")
        body_html = convert_md_to_html(md_text)

        chapter_html = f"""
        <div class="chapter">
            <div class="chapter-header">
                <div class="chapter-num">Chapter {i}</div>
                <h1>{title}</h1>
            </div>
            {body_html}
        </div>
        """
        html_parts.append(chapter_html)
        print(f"  [OK] {filepath}")

    full_html = f"""<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="utf-8"/>
    <style>{CSS}</style>
</head>
<body>
{''.join(html_parts)}
</body>
</html>"""

    output_path = PROJECT_ROOT / "CSO_정산포털_기술문서.pdf"
    HTML(string=full_html).write_pdf(str(output_path))
    print(f"\n  PDF 생성 완료: {output_path}")


if __name__ == "__main__":
    main()
