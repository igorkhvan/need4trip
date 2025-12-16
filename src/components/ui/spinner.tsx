import { cn } from "@/lib/utils";

export interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Spinner({ size = "md", className }: SpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4 border-2",
    md: "h-8 w-8 border-2",
    lg: "h-12 w-12 border-3",
  };

  return (
    <div
      className={cn(
        "inline-block animate-spin rounded-full border-solid border-[#FF6F2C] border-r-transparent",
        sizeClasses[size],
        className
      )}
      role="status"
      aria-label="Загрузка"
    >
      <span className="sr-only">Загрузка...</span>
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <div className="text-center">
        <Spinner size="lg" />
        <p className="mt-4 text-base text-[#6B7280]">Загрузка...</p>
      </div>
    </div>
  );
}

export function FullPageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="text-center">
        <div className="mb-6 flex justify-center">
          <div className="relative">
            <Spinner size="lg" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-6 w-6 rounded-full bg-gradient-to-br from-[#FF6F2C] to-[#E86223]" />
            </div>
          </div>
        </div>
        <h2 className="mb-2 text-xl font-semibold text-[#111827]">Need4Trip</h2>
        <p className="text-base text-[#6B7280]">Загружаем данные...</p>
      </div>
    </div>
  );
}

