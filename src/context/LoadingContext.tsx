"use client";

import { createContext, useContext, useState, ReactNode } from 'react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

type LoadingContextType = {
  isLoading: boolean;
  startLoading: () => void;
  stopLoading: () => void;
  withLoading: <T>(promise: Promise<T>) => Promise<T>;
};

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [loadingCount, setLoadingCount] = useState(0);

  const startLoading = () => setLoadingCount(prev => prev + 1);
  const stopLoading = () => setLoadingCount(prev => Math.max(0, prev - 1));

  const withLoading = async <T,>(promise: Promise<T>): Promise<T> => {
    startLoading();
    try {
      return await promise;
    } finally {
      stopLoading();
    }
  };

  return (
    <LoadingContext.Provider
      value={{
        isLoading: loadingCount > 0,
        startLoading,
        stopLoading,
        withLoading,
      }}
    >
      {children}
      {loadingCount > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <LoadingSpinner fullScreen size="lg" />
        </div>
      )}
    </LoadingContext.Provider>
  );
}

export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
};
