"use client";

import { useCallback, useEffect, useRef } from "react";
import type { LessonDetail, LessonProgressStatus } from "../lib/types";
import { syncLessonProgress } from "../lib/progress-client";

const SYNC_THRESHOLD_SECONDS = 15;

interface LessonVideoPlayerProps {
  lessonId: string;
  lesson: LessonDetail;
  fallbackLabel: string;
}

export function LessonVideoPlayer({ lessonId, lesson, fallbackLabel }: LessonVideoPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastSyncedSeconds = useRef(0);

  const handleSync = useCallback(
    async (status: LessonProgressStatus, seconds: number, duration?: number | null) => {
      if (!lessonId) {
        return;
      }

      const roundedCurrent = Math.max(0, Math.round(seconds));
      const roundedDuration = typeof duration === "number" && Number.isFinite(duration)
        ? Math.round(duration)
        : undefined;

      if (
        status === "in_progress" &&
        lastSyncedSeconds.current > 0 &&
        roundedCurrent - lastSyncedSeconds.current < SYNC_THRESHOLD_SECONDS
      ) {
        return;
      }

      try {
        await syncLessonProgress({
          lessonId,
          status,
          lastPositionSeconds: roundedCurrent,
          watchedSeconds: roundedDuration ? Math.min(roundedCurrent, roundedDuration) : roundedCurrent
        });
        lastSyncedSeconds.current = roundedCurrent;
      } catch (error) {
        console.error("Failed to sync lesson progress", error);
      }
    },
    [lessonId]
  );

  const setupVimeo = useCallback(() => {
    if (!iframeRef.current) {
      return () => undefined;
    }

    let player: VimeoPlayerInstance | null = null;
    let disposed = false;

    (async () => {
      try {
        const api = await loadVimeoApi();
        if (!iframeRef.current || disposed) {
          return;
        }
        player = new api.Player(iframeRef.current);
        const handlePlay = (data: VimeoTimePayload) => {
          handleSync("in_progress", data?.seconds ?? 0, data?.duration);
        };
        const handleTimeUpdate = (data: VimeoTimePayload) => {
          handleSync("in_progress", data?.seconds ?? 0, data?.duration);
        };
        const handleEnded = (data: VimeoTimePayload) => {
          const finalTime = data?.duration ?? data?.seconds ?? 0;
          handleSync("completed", finalTime, finalTime);
        };
        player.on("play", handlePlay);
        player.on("timeupdate", handleTimeUpdate);
        player.on("ended", handleEnded);
        cleanupCallbacks.set(player, { handlePlay, handleTimeUpdate, handleEnded });
      } catch (error) {
        console.error("Failed to initialize Vimeo player", error);
      }
    })();

    return () => {
      disposed = true;
      const callbacks = player ? cleanupCallbacks.get(player) : null;
      if (player && callbacks) {
        player.off("play", callbacks.handlePlay);
        player.off("timeupdate", callbacks.handleTimeUpdate);
        player.off("ended", callbacks.handleEnded);
      }
      player?.destroy?.();
      if (player) {
        cleanupCallbacks.delete(player);
      }
    };
  }, [handleSync]);

  const setupHtml5 = useCallback(() => {
    const element = videoRef.current;
    if (!element) {
      return () => undefined;
    }

    const onPlay = () => handleSync("in_progress", element.currentTime, element.duration);
    const onTimeUpdate = () => handleSync("in_progress", element.currentTime, element.duration);
    const onEnded = () => handleSync("completed", element.duration || element.currentTime, element.duration || element.currentTime);

    element.addEventListener("play", onPlay);
    element.addEventListener("timeupdate", onTimeUpdate);
    element.addEventListener("ended", onEnded);

    return () => {
      element.removeEventListener("play", onPlay);
      element.removeEventListener("timeupdate", onTimeUpdate);
      element.removeEventListener("ended", onEnded);
    };
  }, [handleSync]);

  useEffect(() => {
    if (!lesson.videoProvider || !lesson.videoRef) {
      return undefined;
    }

    const normalizedProvider = lesson.videoProvider.toLowerCase();
    if (normalizedProvider === "vimeo") {
      return setupVimeo();
    }

    return setupHtml5();
  }, [lesson.videoProvider, lesson.videoRef, setupVimeo, setupHtml5]);

  if (!lesson.videoProvider || !lesson.videoRef) {
    return (
      <div className="lesson-player__video--empty">
        <p>{fallbackLabel}</p>
      </div>
    );
  }

  const normalizedProvider = lesson.videoProvider.toLowerCase();

  if (normalizedProvider === "vimeo") {
    return (
      <div className="lesson-player__video-embed">
        <iframe
          ref={iframeRef}
          src={buildVimeoSrc(lesson.videoRef)}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          title={lesson.title}
        />
      </div>
    );
  }

  return (
    <div className="lesson-player__video-embed">
      <video ref={videoRef} src={lesson.videoRef} controls preload="metadata" playsInline />
    </div>
  );
}

function buildVimeoSrc(reference: string) {
  const id = reference.replace(/[^0-9]/g, "");
  const params = new URLSearchParams({
    autoplay: "0",
    title: "0",
    byline: "0",
    portrait: "0"
  });
  return `https://player.vimeo.com/video/${id}?${params.toString()}`;
}

type VimeoPlayerEvents = "play" | "timeupdate" | "ended";

interface VimeoPlayerInstance {
  on(event: VimeoPlayerEvents, handler: (data: VimeoTimePayload) => void): void;
  off(event: VimeoPlayerEvents, handler: (data: VimeoTimePayload) => void): void;
  destroy(): void;
}

interface VimeoApi {
  Player: new (element: HTMLIFrameElement) => VimeoPlayerInstance;
}

interface VimeoTimePayload {
  seconds?: number;
  duration?: number;
}

const cleanupCallbacks = new WeakMap<
  VimeoPlayerInstance,
  {
    handlePlay: (data: VimeoTimePayload) => void;
    handleTimeUpdate: (data: VimeoTimePayload) => void;
    handleEnded: (data: VimeoTimePayload) => void;
  }
>();

let vimeoApiPromise: Promise<VimeoApi> | null = null;

async function loadVimeoApi(): Promise<VimeoApi> {
  if (typeof window === "undefined") {
    throw new Error("Vimeo API is not available on the server");
  }

  if (window.Vimeo?.Player) {
    return window.Vimeo as VimeoApi;
  }

  if (!vimeoApiPromise) {
    vimeoApiPromise = new Promise<VimeoApi>((resolve, reject) => {
      const existingScript = document.querySelector<HTMLScriptElement>("script[data-vimeo-player]");
      const script = existingScript ?? document.createElement("script");
      script.src = "https://player.vimeo.com/api/player.js";
      script.async = true;
      script.setAttribute("data-vimeo-player", "true");
      script.onload = () => {
        if (window.Vimeo?.Player) {
          resolve(window.Vimeo as VimeoApi);
        } else {
          reject(new Error("Vimeo API failed to initialize"));
        }
      };
      script.onerror = () => reject(new Error("Failed to load Vimeo API"));
      if (!existingScript) {
        document.head.appendChild(script);
      }
    }).catch(error => {
      vimeoApiPromise = null;
      throw error;
    });
  }

  return vimeoApiPromise!;
}

declare global {
  interface Window {
    Vimeo?: VimeoApi;
  }
}
