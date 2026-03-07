import Image from 'next/image';

import type { CompanyInfo } from '@/hooks/useLogin';

interface LoginFooterProps {
  companyInfo: CompanyInfo | null;
}

export function LoginFooter({ companyInfo }: LoginFooterProps) {
  return (
    <footer className="login-glass-footer">
      <div className="max-w-6xl mx-auto space-y-2">
        {/* 회사 정보 */}
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5">
          {companyInfo?.company_name && (
            <span className="login-footer-company">{companyInfo.company_name}</span>
          )}
          {companyInfo?.company_name && (companyInfo.ceo_name || companyInfo.business_number || companyInfo.address || companyInfo.phone) && (
            <span className="login-footer-divider">|</span>
          )}
          {companyInfo?.ceo_name && (
            <span>대표: {companyInfo.ceo_name}</span>
          )}
          {companyInfo?.business_number && (
            <span>사업자: {companyInfo.business_number}</span>
          )}
          {companyInfo?.address && (
            <span>{companyInfo.address}</span>
          )}
          {companyInfo?.phone && (
            <span>TEL: {companyInfo.phone}</span>
          )}
          {companyInfo?.fax && (
            <span>FAX: {companyInfo.fax}</span>
          )}
          {companyInfo?.email && (
            <span>{companyInfo.email}</span>
          )}
          {companyInfo?.website && (
            <a href={companyInfo.website} target="_blank" rel="noopener noreferrer">
              {companyInfo.website}
            </a>
          )}
        </div>

        {/* 저작권 및 라이선스 */}
        <div className="login-footer-copyright flex flex-wrap items-center justify-center gap-x-2 gap-y-1 pt-1">
          <span>&copy; 2026 KDH | Sales Management Team</span>
          <span className="login-footer-divider">|</span>
          {/* 공공누리 */}
          <a
            href="https://www.kogl.or.kr/info/license.do#702"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1"
          >
            <Image
              src="https://www.kogl.or.kr/open/web/images/images_2014/codetype/new_img_opencode1.jpg"
              alt="공공누리"
              width={64}
              height={16}
              className="h-4 w-auto"
            />
            <span>공공누리</span>
          </a>
          <span className="login-footer-divider">|</span>
          {/* CC BY 4.0 */}
          <a
            href="https://creativecommons.org/licenses/by/4.0/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5"
          >
            <Image src="https://mirrors.creativecommons.org/presskit/icons/cc.svg" alt="CC" width={14} height={14} className="h-3.5 w-3.5" />
            <Image src="https://mirrors.creativecommons.org/presskit/icons/by.svg" alt="BY" width={14} height={14} className="h-3.5 w-3.5" />
            <span>CC BY 4.0</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
