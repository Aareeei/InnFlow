import { cn } from '../utils/cn';

export type LoadingSpinnerProps = {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
  fullPage?: boolean;
};

const sizeStyles = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-2',
  lg: 'h-12 w-12 border-[3px]',
};

export function LoadingSpinner({
  size = 'md',
  label,
  className,
  fullPage,
}: LoadingSpinnerProps) {
  const spinner = (
    <div className={cn('flex flex-col items-center gap-3', className)}>
      <div
        className={cn(
          'animate-spin rounded-full border-ops-accent border-t-transparent',
          sizeStyles[size],
        )}
        role="status"
        aria-label={label ?? 'Loading'}
      />
      {label && <p className="text-sm text-ops-muted">{label}</p>}
    </div>
  );

  if (fullPage) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">{spinner}</div>
    );
  }

  return spinner;
}
