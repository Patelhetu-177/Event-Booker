"use client";

import { useCallback, useState } from "react";
import { toast } from "@/components/ui/toast";

type UseLoadingToastOptions = {
  loadingText?: string;
  successText?: string;
  errorText?: string;
};

export function useLoadingToast({
  loadingText = "Processing...",
  successText = "Operation completed successfully!",
  errorText = "An error occurred. Please try again.",
}: UseLoadingToastOptions = {}) {
  const [isLoading, setIsLoading] = useState(false);

  const withLoading = useCallback(
    async <T,>(promise: Promise<T>): Promise<T | undefined> => {
      setIsLoading(true);
      
      try {
        // Show loading toast
        toast({
          title: loadingText,
          variant: "default",
        });

        const result = await promise;
        
        // Show success toast
        toast({
          title: successText,
          variant: "success",
        });
        
        return result;
      } catch (error) {
        console.error("Error in withLoading:", error);
        
        toast({
          title: errorText,
          description: error instanceof Error ? error.message : undefined,
          variant: "destructive",
        });
        
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [loadingText, successText, errorText]
  );

  return { isLoading, withLoading };
}
