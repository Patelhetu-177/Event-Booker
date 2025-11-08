"use client";

import { Button } from "./button";
import { Loader2 } from "lucide-react";
import { forwardRef, ReactNode } from "react";

interface LoadingButtonProps extends React.ComponentProps<typeof Button> {
  isLoading?: boolean;
  loadingText?: string;
  children: ReactNode;
}

export const LoadingButton = forwardRef<HTMLButtonElement, LoadingButtonProps>(
  ({ children, isLoading = false, loadingText, className, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        disabled={isLoading || props.disabled}
        className={className}
        {...props}
      >
        {isLoading ? (
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            {loadingText || children}
          </div>
        ) : (
          children
        )}
      </Button>
    );
  }
);

LoadingButton.displayName = "LoadingButton";
