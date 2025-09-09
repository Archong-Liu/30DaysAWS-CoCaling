import { useEffect, useMemo, useState } from 'react';

// 以 userAgent 搭配視窗寬度偵測手機裝置
export function useIsMobile(breakpoint = 768) {
  const getIsMobileByUA = () => {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent || navigator.vendor || (window && window.opera) || '';
    return /android|iphone|ipad|ipod|mobile|blackberry|iemobile|opera mini/i.test(String(ua));
  };

  const getIsMobileByWidth = () => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth <= breakpoint;
  };

  const initial = useMemo(() => (getIsMobileByUA() || getIsMobileByWidth()), []);
  const [isMobile, setIsMobile] = useState(initial);

  useEffect(() => {
    const handler = () => {
      setIsMobile(getIsMobileByUA() || getIsMobileByWidth());
    };
    window.addEventListener('resize', handler);
    window.addEventListener('orientationchange', handler);
    return () => {
      window.removeEventListener('resize', handler);
      window.removeEventListener('orientationchange', handler);
    };
  }, []);

  return isMobile;
}

export default useIsMobile;


