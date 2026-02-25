#!/usr/bin/env python3
"""모든 문서를 하나의 PDF로 병합 출력"""

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

# 문서 순서 정의
DOCS = [
    ("README.md", "CSO 정산 포털"),
    ("docs/ARCHITECTURE.md", "아키텍처"),
    ("docs/API-DATABASE.md", "API & 데이터베이스 레퍼런스"),
    ("docs/API_REFERENCE.md", "API Reference (외부/내부)"),
    ("docs/ONBOARDING.md", "온보딩 가이드"),
    ("docs/OPERATIONS.md", "배포 & 운영"),
    ("CHANGELOG.md", "Changelog"),
]

# shields.io 배지 → 텍스트 치환 (이미지 깨짐 방지)
BADGE_MAP = {
    "nextjs-shield": ("Next.js", "#000000", "#ffffff"),
    "typescript-shield": ("TypeScript", "#3178C6", "#ffffff"),
    "supabase-shield": ("Supabase", "#3FCF8E", "#ffffff"),
    "tailwind-shield": ("Tailwind CSS", "#06B6D4", "#ffffff"),
    "netlify-shield": ("Netlify", "#00C7B7", "#ffffff"),
}

CSS = """
@page {
    size: A4;
    margin: 20mm 18mm 20mm 18mm;
    @bottom-center {
        content: "CSO 정산 포털 — 기술 문서  |  페이지 " counter(page) " / " counter(pages);
        font-size: 8pt;
        color: #888;
    }
}

body {
    font-family: "Noto Sans KR", "Malgun Gothic", "맑은 고딕", "Apple SD Gothic Neo", sans-serif;
    font-size: 10pt;
    line-height: 1.6;
    color: #1a1a1a;
}

/* 장 구분 */
.chapter {
    page-break-before: always;
}
.chapter:first-child {
    page-break-before: avoid;
}

h1 {
    font-size: 20pt;
    color: #111;
    border-bottom: 3px solid #333;
    padding-bottom: 8px;
    margin-top: 0;
}
h2 {
    font-size: 15pt;
    color: #222;
    border-bottom: 1px solid #ccc;
    padding-bottom: 4px;
    margin-top: 20px;
}
h3 {
    font-size: 12pt;
    color: #333;
    margin-top: 16px;
}
h4 {
    font-size: 10.5pt;
    color: #444;
}

table {
    border-collapse: collapse;
    width: 100%;
    margin: 10px 0;
    font-size: 9pt;
}
th, td {
    border: 1px solid #ddd;
    padding: 6px 8px;
    text-align: left;
    word-break: break-word;
}
th {
    background-color: #f5f5f5;
    font-weight: 600;
}
tr:nth-child(even) {
    background-color: #fafafa;
}

code {
    background-color: #f4f4f4;
    padding: 1px 4px;
    border-radius: 3px;
    font-size: 9pt;
    font-family: "D2Coding", "Consolas", "Courier New", monospace;
}
pre {
    background-color: #f4f4f4;
    padding: 10px 12px;
    border-radius: 4px;
    border: 1px solid #e0e0e0;
    overflow-x: auto;
    font-size: 8.5pt;
    line-height: 1.5;
}
pre code {
    background: none;
    padding: 0;
}

blockquote {
    border-left: 3px solid #ccc;
    margin: 10px 0;
    padding: 4px 12px;
    color: #555;
    background: #fafafa;
}

a {
    color: #2563eb;
    text-decoration: none;
}

/* 배지 스타일 */
.badge {
    display: inline-block;
    padding: 4px 12px;
    border-radius: 4px;
    color: white;
    font-weight: 600;
    font-size: 9pt;
    margin: 2px 4px;
}

/* 체크박스 리스트 */
ul {
    padding-left: 20px;
}
li {
    margin: 2px 0;
}

/* details/summary */
details {
    margin: 8px 0;
}
summary {
    cursor: pointer;
    font-weight: 600;
}

hr {
    border: none;
    border-top: 1px solid #ddd;
    margin: 16px 0;
}

/* 표지 스타일 */
.cover {
    text-align: center;
    padding-top: 180px;
}
.cover h1 {
    font-size: 32pt;
    border: none;
    color: #111;
    margin-bottom: 10px;
}
.cover .version {
    font-size: 14pt;
    color: #666;
    margin-bottom: 30px;
}
.cover .subtitle {
    font-size: 12pt;
    color: #555;
    margin-bottom: 60px;
}
.cover .date {
    font-size: 10pt;
    color: #888;
}
.cover .badges {
    margin: 24px 0;
}

/* 목차 스타일 */
.toc h1 {
    font-size: 18pt;
}
.toc ul {
    list-style: none;
    padding-left: 0;
}
.toc li {
    padding: 4px 0;
    border-bottom: 1px dotted #ddd;
}
.toc a {
    text-decoration: none;
}
"""


def resolve_reference_links(text: str) -> str:
    """마크다운 레퍼런스 링크를 인라인으로 변환"""
    refs = {}
    for m in re.finditer(r'^\[([^\]]+)\]:\s*(.+)$', text, re.MULTILINE):
        refs[m.group(1).lower()] = m.group(2).strip()

    # [![alt][img-ref]][link-ref] 패턴을 배지 HTML로 변환
    def replace_badge_link(m):
        img_ref = m.group(1).lower()
        link_ref = m.group(2).lower()
        for key, (label, bg, fg) in BADGE_MAP.items():
            if key in img_ref:
                url = refs.get(link_ref, "#")
                return f'<span class="badge" style="background-color:{bg};color:{fg}">{label}</span>'
        img_url = refs.get(img_ref, "")
        link_url = refs.get(link_ref, "#")
        return f'<a href="{link_url}"><img src="{img_url}" alt="{m.group(1)}"/></a>'

    text = re.sub(r'\[!\[([^\]]*)\]\[([^\]]+)\]\]\[([^\]]+)\]',
                  lambda m: replace_badge_link(type('', (), {'group': lambda s,i: [None, m.group(1), m.group(2), m.group(3)][i]})()),
                  text)

    # 기술 스택 테이블의 배지 이미지도 텍스트로 변환
    for key, (label, bg, fg) in BADGE_MAP.items():
        shield_ref = f"[{key}]"
        url_ref = key.replace("-shield", "-url")
        pattern = rf'\[!\[{re.escape(label)}\]\[{re.escape(key)}\]\]\[{re.escape(url_ref)}\]'
        badge_html = f'<span class="badge" style="background-color:{bg};color:{fg}">{label}</span>'
        text = re.sub(pattern, badge_html, text)

    # 남은 레퍼런스 링크 제거 (정의 라인)
    text = re.sub(r'^\[([^\]]+)\]:\s*.+$', '', text, flags=re.MULTILINE)

    return text


def process_checkboxes(text: str) -> str:
    """체크박스 마크다운을 HTML 체크박스로 변환"""
    text = text.replace("- [x] ", "- &#9745; ")
    text = text.replace("- [ ] ", "- &#9744; ")
    return text


def convert_md_to_html(md_text: str) -> str:
    """마크다운 → HTML 변환"""
    md_text = resolve_reference_links(md_text)
    md_text = process_checkboxes(md_text)

    extensions = ['tables', 'fenced_code', 'codehilite', 'toc', 'nl2br']
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
        <div class="version">v0.14.1</div>
        <div class="subtitle">CSO(위탁영업) 업체가 제약사 정산 수수료를 조회하는 B2B 포털</div>
        <div class="badges">{badges_html}</div>
        <div class="date">2026-02-25 기준</div>
        <div style="margin-top:40px;color:#888;font-size:9pt">
            영업관리팀 권대환 — qwer@ukp.co.kr
        </div>
    </div>
    """


def build_toc() -> str:
    """목차 생성"""
    items = ""
    for i, (_, title) in enumerate(DOCS, 1):
        items += f'<li>{i}. {title}</li>\n'

    return f"""
    <div class="chapter toc">
        <h1>목차</h1>
        <ul>{items}</ul>
    </div>
    """


def main():
    html_parts = [build_cover_page(), build_toc()]

    for filepath, title in DOCS:
        full_path = PROJECT_ROOT / filepath
        if not full_path.exists():
            print(f"  [SKIP] {filepath} not found")
            continue

        md_text = full_path.read_text(encoding="utf-8")
        body_html = convert_md_to_html(md_text)

        html_parts.append(f'<div class="chapter"><h1>{title}</h1>{body_html}</div>')
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
