'use client';

import { useEffect, useCallback } from 'react';

// 다음 주소 검색 타입 선언
declare global {
  interface Window {
    daum: {
      Postcode: new (options: {
        oncomplete: (data: DaumPostcodeData) => void;
      }) => { open: () => void };
    };
  }
}

interface DaumPostcodeData {
  address: string;
  roadAddress: string;
  jibunAddress: string;
  addressType: string;
  bname: string;
  buildingName: string;
  zonecode: string;
}

export interface PostcodeResult {
  zonecode: string;
  address: string;
}

/**
 * 다음 우편번호 검색 훅
 * - 스크립트 자동 로드
 * - openSearch(callback) 으로 주소 검색 팝업 호출
 */
export function useDaumPostcode() {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
    script.async = true;
    document.head.appendChild(script);
    return () => {
      document.head.removeChild(script);
    };
  }, []);

  const openSearch = useCallback((onComplete: (result: PostcodeResult) => void) => {
    if (typeof window !== 'undefined' && window.daum) {
      new window.daum.Postcode({
        oncomplete: (data: DaumPostcodeData) => {
          onComplete({
            zonecode: data.zonecode,
            address: data.roadAddress || data.address,
          });
        },
      }).open();
    } else {
      alert('주소 검색 서비스를 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
    }
  }, []);

  return { openSearch };
}
