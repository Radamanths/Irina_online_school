"use client";

/* eslint-disable @next/next/no-img-element */

import { useRef, useState, useTransition } from "react";
import type { ChangeEvent } from "react";
import { Button } from "@virgo/ui";
import type { MediaAssetRecord } from "../lib/api";
import { refreshMediaLibraryAction, requestMediaUploadAction } from "../actions/media-library";

interface MediaLibraryProps {
  initialAssets: MediaAssetRecord[];
}

export function MediaLibrary({ initialAssets }: MediaLibraryProps) {
  const [assets, setAssets] = useState<MediaAssetRecord[]>(initialAssets);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isRefreshing, startRefresh] = useTransition();

  const handleSelectClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setError(null);
    setUploading(true);
    try {
      const ticket = await requestMediaUploadAction({
        filename: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        type: inferMediaType(file.type)
      });

      const uploadResponse = await fetch(ticket.uploadUrl, {
        method: "PUT",
        headers: {
          ...ticket.headers,
          "Content-Type": file.type || ticket.headers["Content-Type"] || "application/octet-stream"
        },
        body: file
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed with status ${uploadResponse.status}`);
      }

      startRefresh(() => {
        refreshMediaLibraryAction()
          .then(setAssets)
          .catch(() => {
            setError("Не удалось обновить библиотеку после загрузки");
          });
      });
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : "Не удалось загрузить файл";
      setError(message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const isBusy = uploading || isRefreshing;

  return (
    <section className="media-library" aria-live="polite">
      <div className="media-library__controls">
        <div>
          <p className="eyebrow">Медиабиблиотека</p>
          <p className="muted">Загрузите обложки, трейлеры и гайды. PNG, JPG, WebM и PDF до 150 МБ.</p>
        </div>
        <div className="media-library__actions">
          <input
            ref={fileInputRef}
            type="file"
            className="sr-only"
            onChange={handleFileChange}
            accept="image/*,video/*,application/pdf"
            disabled={isBusy}
          />
          <Button type="button" onClick={handleSelectClick} disabled={isBusy}>
            {isBusy ? "Загружаем..." : "Выбрать файл"}
          </Button>
        </div>
      </div>
      {error && <p className="form-error media-library__error">{error}</p>}
      {assets.length === 0 ? (
        <p className="media-empty">Пока нет загруженных файлов. Добавьте изображение обложки или трейлер курса.</p>
      ) : (
        <div className="media-grid">
          {assets.map(asset => (
            <article key={asset.id} className="media-card">
              <div className={`media-card__preview media-card__preview--${asset.type}`}>
                {asset.type === "image" ? (
                  <img src={asset.url} alt={asset.label} loading="lazy" />
                ) : (
                  <span>{asset.type}</span>
                )}
              </div>
              <header className="media-card__header">
                <strong>{asset.label}</strong>
                <p className="media-card__meta">
                  {asset.size} · {asset.mimeType ?? "unknown"}
                </p>
              </header>
              <p className="media-card__meta">{asset.createdAt}</p>
              <a className="media-card__link" href={asset.url} target="_blank" rel="noreferrer">
                Открыть в новой вкладке
              </a>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function inferMediaType(mime: string): string {
  if (mime.startsWith("image/")) {
    return "image";
  }
  if (mime.startsWith("video/")) {
    return "video";
  }
  if (mime.startsWith("audio/")) {
    return "audio";
  }
  if (mime === "application/pdf") {
    return "document";
  }
  return "file";
}
