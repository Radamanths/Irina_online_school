"use client";

import { useNetworkStatus } from "../hooks/use-network-status";

interface OfflineBannerProps {
  title: string;
  description: string;
  retryLabel: string;
  className?: string;
}

export function OfflineBanner({ title, description, retryLabel, className }: OfflineBannerProps) {
  const { isOffline, refresh } = useNetworkStatus();

  if (!isOffline) {
    return null;
  }

  const classes = ["offline-banner", className].filter(Boolean).join(" ");

  return (
    <div className={classes} role="status" aria-live="polite">
      <div className="offline-banner__body">
        <p className="offline-banner__title">{title}</p>
        <p className="offline-banner__description">{description}</p>
      </div>
      <button type="button" className="button button--ghost offline-banner__action" onClick={refresh}>
        {retryLabel}
      </button>
    </div>
  );
}
