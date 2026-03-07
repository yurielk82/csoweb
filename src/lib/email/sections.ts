// ============================================
// 이메일 섹션 빌더 (메일머지에서 사용)
// ============================================

export type EmailSectionId = 'notice' | 'dashboard' | 'table' | 'body';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildBodyHtml(body: string): string {
  const lines = body.split('\n').map(line =>
    line.trim() ? `<p style="margin: 0 0 12px;">${escapeHtml(line)}</p>` : '<br>'
  ).join('');
  return `<div style="color: #374151; font-size: 14px; line-height: 1.8; padding: 0 20px;">${lines}</div>`;
}

export function buildNoticeHtml(notice: string): string {
  if (!notice) return '';
  return `<div style="margin:16px 20px;padding:12px 16px;border-left:4px solid #f59e0b;background:#fefce8;">
    <p style="font-weight:bold;font-size:13px;color:#92400e;margin:0 0 8px;">[ Notice ]</p>
    <div style="font-size:12px;color:#78350f;line-height:1.8;white-space:pre-line;">${escapeHtml(notice)}</div>
  </div>`;
}

export function buildDashboardHtml(summary: {
  총_금액: number;
  총_수수료: number;
  데이터_건수: number;
  총_수량: number;
}): string {
  const fmt = (v: number) => v.toLocaleString('ko-KR');
  return `<div style="margin:16px 20px;padding:16px 20px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;">
    <div style="font-size:13px;font-weight:600;color:#334155;">★ 총 수수료 (세금계산서 발행 금액)</div>
    <div style="font-size:18px;font-weight:700;color:#1e40af;margin-top:6px;">${fmt(summary.총_수수료)}원</div>
  </div>`;
}

export function buildDataTableHtml(params: {
  columns: { key: string; name: string; isNumeric: boolean }[];
  rows: Record<string, unknown>[];
  company_name: string;
  year_month: string;
}): string {
  const formatNumber = (val: unknown): string => {
    if (val === null || val === undefined || val === '') return '';
    const num = Number(val);
    if (isNaN(num)) return String(val);
    return num.toLocaleString('ko-KR');
  };

  const headerCells = params.columns
    .map(col => `<th style="border:1px solid #999;padding:4px 8px;background:#e2e8f0;font-size:12px;white-space:nowrap;text-align:center;">${col.name}</th>`)
    .join('');

  const bodyRows = params.rows.map((row, i) => {
    const bgColor = i % 2 === 0 ? '#ffffff' : '#f8fafc';
    const cells = params.columns.map(col => {
      const val = row[col.key];
      const align = col.isNumeric ? 'right' : 'left';
      const display = col.isNumeric ? formatNumber(val) : (val ?? '');
      return `<td style="border:1px solid #ccc;padding:3px 6px;font-size:11px;white-space:nowrap;text-align:${align};">${display}</td>`;
    }).join('');
    return `<tr style="background:${bgColor};">${cells}</tr>`;
  }).join('');

  return `<div style="margin:16px 0;padding:0 20px;">
    <p style="font-size:14px;font-weight:bold;color:#1e293b;margin:0 0 8px;">
      ${params.company_name} - ${params.year_month} 정산서
    </p>
    <div style="overflow-x:auto;">
      <table cellspacing="0" cellpadding="0" style="border-collapse:collapse;font-family:monospace,sans-serif;">
        <thead><tr>${headerCells}</tr></thead>
        <tbody>${bodyRows}</tbody>
      </table>
    </div>
  </div>`;
}
