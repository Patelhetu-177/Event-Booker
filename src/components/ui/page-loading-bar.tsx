"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function PageLoadingBar() {
  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleStart = () => {
      setIsVisible(true);
      setProgress(30);
    };

    const handleComplete = () => {
      setProgress(100);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setProgress(0);
      }, 300);
      return () => clearTimeout(timer);
    };

    if (isVisible) {
      const timer = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) return 90;
          return prev + 10;
        });
      }, 150);
      
      return () => clearInterval(timer);
    }
  }, [isVisible]);

  // Listen to route changes
  useEffect(() => {
    const localHandleStart = () => {
      setIsVisible(true);
      setProgress(30);
    };

    const localHandleComplete = () => {
      setProgress(100);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setProgress(0);
      }, 300);
      return () => clearTimeout(timer);
    };

    window.addEventListener('beforeunload', localHandleStart);
    
    // Initial load
    localHandleStart();
    const timer = setTimeout(localHandleComplete, 1000); // Fallback in case navigation takes too long
    
    return () => {
      window.removeEventListener('beforeunload', localHandleStart);
      clearTimeout(timer);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 h-1 z-50 overflow-hidden">
      <motion.div
        className="h-full bg-primary"
        initial={{ width: '0%' }}
        animate={{ width: `${progress}%` }}
        exit={{ width: '100%' }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      />
    </div>
  );
}
