'use client';

type SuccessBannerProps = {
  message: string | null;
  onDismiss?: () => void;
};

export function SuccessBanner({ message, onDismiss }: SuccessBannerProps) {
  if (!message) {
    return null;
  }

  return (
    <div
      className="mb-3 border border-green-700 bg-green-100 px-3 py-2 text-sm text-green-900"
      data-testid="success-message"
      role="status"
    >
      <div className="flex items-center justify-between gap-3">
        <span>{message}</span>
        {onDismiss ? (
          <button
            type="button"
            className="pms-button"
            data-testid="success-dismiss"
            onClick={onDismiss}
          >
            OK
          </button>
        ) : null}
      </div>
    </div>
  );
}
