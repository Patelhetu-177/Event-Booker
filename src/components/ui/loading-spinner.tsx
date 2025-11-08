import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "primary" | "secondary" | "destructive" | "outline" | "ghost";
  fullScreen?: boolean;
  text?: string;
}

export function LoadingSpinner({
  className,
  size = "md",
  variant = "primary",
  fullScreen = false,
  text,
  ...props
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4 border-2",
    md: "h-8 w-8 border-2",
    lg: "h-12 w-12 border-[3px]",
    xl: "h-16 w-16 border-[4px]"
  };

  const variantClasses = {
    primary: "border-t-primary border-r-primary/30 border-b-primary/30 border-l-primary/30",
    secondary: "border-t-secondary border-r-secondary/30 border-b-secondary/30 border-l-secondary/30",
    destructive: "border-t-destructive border-r-destructive/30 border-b-destructive/30 border-l-destructive/30",
    outline: "border-t-foreground border-r-foreground/30 border-b-foreground/30 border-l-foreground/30",
    ghost: "border-t-muted-foreground border-r-muted-foreground/30 border-b-muted-foreground/30 border-l-muted-foreground/30",
  };

  const spinner = (
    <div className={cn("flex flex-col items-center justify-center space-y-4", className)} {...props}>
      <div className="relative">
        <div 
          className={cn(
            "animate-spin rounded-full",
            sizeClasses[size],
            variantClasses[variant]
          )}
          style={{
            animationTimingFunction: "cubic-bezier(0.5, 0, 0.5, 1)",
            animationDuration: "0.8s",
          }}
        >
          <span className="sr-only">Loading...</span>
        </div>
        {size === 'xl' && (
          <div 
            className={cn(
              "absolute inset-0 m-auto rounded-full",
              size === 'xl' ? 'h-10 w-10' : 'h-4 w-4',
              variant === 'primary' ? 'bg-primary/10' : 
              variant === 'secondary' ? 'bg-secondary/10' :
              variant === 'destructive' ? 'bg-destructive/10' :
              'bg-muted/10'
            )}
          />
        )}
      </div>
      {text && (
        <p className={cn(
          "text-sm font-medium text-muted-foreground animate-pulse",
          size === 'xl' ? 'text-base' : 'text-sm'
        )}>
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
        {spinner}
      </div>
    );
  }

  return spinner;
}

export function LoadingPage({ text = "Loading..." } = {}) {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background">
      <LoadingSpinner size="xl" text={text} fullScreen />
    </div>
  );
}

export function LoadingSection({ className = "" }) {
  return (
    <div className={cn("flex flex-col items-center justify-center p-8", className)}>
      <LoadingSpinner size="lg" variant="outline" />
      <p className="mt-4 text-muted-foreground animate-pulse text-sm">Loading content...</p>
    </div>
  );
}

export function LoadingCard({ className = "" }) {
  return (
    <div className={cn("rounded-lg border bg-card p-6 shadow-sm", className)}>
      <div className="flex flex-col items-center justify-center space-y-4">
        <LoadingSpinner size="md" variant="ghost" />
        <p className="text-muted-foreground text-sm">Loading data...</p>
      </div>
    </div>
  );
}

export function LoadingButton({
  className,
  loadingText = "Loading...",
  ...props
}: { loadingText?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "inline-flex items-center justify-center gap-2 text-sm font-medium transition-colors",
        className
      )}
      {...props}
    >
      <LoadingSpinner size="sm" variant="ghost" />
      <span>{loadingText}</span>
    </div>
  );
}
