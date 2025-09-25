"use client";
import { useEffect, useState } from 'react';

export function useIsMobile(breakpointPx: number = 640) {
  const [isMobile, setIsMobile] = useState<boolean>(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpointPx}px)`);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    // initial
    setIsMobile(mq.matches);
    if ('addEventListener' in mq) {
      mq.addEventListener('change', handler);
    } else if ('addListener' in mq) {
      (mq as MediaQueryList & { addListener: (cb: (e: MediaQueryListEvent) => void) => void }).addListener(handler);
    }
    return () => {
      if ('removeEventListener' in mq) {
        mq.removeEventListener('change', handler);
      } else if ('removeListener' in mq) {
        (mq as MediaQueryList & { removeListener: (cb: (e: MediaQueryListEvent) => void) => void }).removeListener(handler);
      }
    };
  }, [breakpointPx]);
  return isMobile;
}
