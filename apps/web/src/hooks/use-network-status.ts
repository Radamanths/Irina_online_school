"use client";

import { useCallback, useEffect, useState } from "react";

export function useNetworkStatus() {
  const [isOffline, setIsOffline] = useState(() => (typeof navigator === "undefined" ? false : !navigator.onLine));
  const [updatedAt, setUpdatedAt] = useState<Date | null>(() =>
    typeof navigator === "undefined" || navigator.onLine ? null : new Date()
  );

  const refresh = useCallback(() => {
    const offline = typeof navigator === "undefined" ? false : !navigator.onLine;
    setIsOffline(offline);
    setUpdatedAt(offline ? new Date() : null);
    return offline;
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setUpdatedAt(null);
    };

    const handleOffline = () => {
      setIsOffline(true);
      setUpdatedAt(new Date());
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return { isOffline, updatedAt, refresh };
}
