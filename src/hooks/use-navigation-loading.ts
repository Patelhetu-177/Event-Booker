'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

export function useNavigationLoading() {
  const [isNavigating, setIsNavigating] = useState(false);
  const pathname = usePathname();
  const [prevPath, setPrevPath] = useState(pathname);

  useEffect(() => {
    // Only update if the path actually changed
    if (pathname !== prevPath) {
      setIsNavigating(true);
      setPrevPath(pathname);
      
      // Set a small delay before marking navigation as complete
      const timer = setTimeout(() => {
        setIsNavigating(false);
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [pathname, prevPath]);

  return isNavigating;
}
