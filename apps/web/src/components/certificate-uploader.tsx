"use client";

import { useCallback, useRef, useState } from "react";
import type { DragEvent } from "react";

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB
const uploadEndpoint =
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_BASE
    ? `${process.env.NEXT_PUBLIC_API_BASE.replace(/\/$/, "")}/certificates/upload`
    : null;

type CertificateUploaderProps = {
  title: string;
  subtitle: string;
  dropLabel: string;
  buttonLabel: string;
  hint: string;
  statusReady: string;
  statusUploading: string;
  statusSuccess: string;
  statusError: string;
  errorType: string;
  errorSize: string;
};

type UploadState = "idle" | "uploading" | "success" | "error";

export function CertificateUploader({
  title,
  subtitle,
  dropLabel,
  buttonLabel,
  hint,
  statusReady,
  statusUploading,
  statusSuccess,
  statusError,
  errorType,
  errorSize
}: CertificateUploaderProps) {
  const [status, setStatus] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const progressRef = useRef<number | null>(null);

  const resetProgressTimer = useCallback(() => {
    if (progressRef.current) {
      window.clearInterval(progressRef.current);
      progressRef.current = null;
    }
  }, []);

  const simulateProgress = useCallback(() => {
    resetProgressTimer();
    progressRef.current = window.setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) {
          return prev;
        }
        const next = prev + Math.max(2, Math.random() * 8);
        return Math.min(next, 95);
      });
    }, 250);
  }, [resetProgressTimer]);

  const uploadFile = useCallback(async (file: File) => {
    setStatus("uploading");
    setErrorMessage(null);
    setProgress(5);
    setFileName(file.name);
    simulateProgress();

    try {
      if (uploadEndpoint) {
        const formData = new FormData();
        formData.append("file", file);
        const response = await fetch(uploadEndpoint, {
          method: "POST",
          body: formData
        });
        if (!response.ok) {
          throw new Error("Upload failed");
        }
      } else {
        await new Promise(resolve => window.setTimeout(resolve, 1500));
      }

      resetProgressTimer();
      setProgress(100);
      setStatus("success");
      window.setTimeout(() => setProgress(0), 600);
    } catch (error) {
      resetProgressTimer();
      setStatus("error");
      const message = error instanceof Error && error.message ? error.message : null;
      setErrorMessage(message ?? statusError);
    }
  }, [resetProgressTimer, simulateProgress, statusError]);

  const handleFileSelection = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) {
        return;
      }
      const file = files[0];
      const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      if (!isPdf) {
        setStatus("error");
        setErrorMessage(errorType);
        return;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setStatus("error");
        setErrorMessage(errorSize);
        return;
      }
      uploadFile(file);
    },
    [errorSize, errorType, uploadFile]
  );

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    handleFileSelection(event.dataTransfer.files);
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (event.currentTarget.contains(event.relatedTarget as Node)) {
      return;
    }
    setIsDragging(false);
  };

  const statusLabel = (() => {
    if (status === "uploading") {
      return `${statusUploading} · ${Math.round(progress)}%`;
    }
    if (status === "success") {
      return statusSuccess;
    }
    if (status === "error") {
      return errorMessage ?? statusError;
    }
    return statusReady;
  })();

  const dropzoneClass = [
    "certificate-uploader__dropzone",
    isDragging ? "is-dragging" : "",
    status === "success" ? "is-success" : "",
    status === "error" ? "is-error" : ""
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="certificate-uploader">
      <div className="certificate-uploader__header">
        <p className="eyebrow">{title}</p>
        <p>{subtitle}</p>
      </div>
      <div
        className={dropzoneClass}
        onDragOver={handleDragOver}
        onDragEnter={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="certificate-uploader__input"
          onChange={event => handleFileSelection(event.target.files)}
        />
        <p>{dropLabel}</p>
        {fileName && <p className="certificate-uploader__filename">{fileName}</p>}
        <button type="button" className="button button--ghost" onClick={() => inputRef.current?.click()}>
          {buttonLabel}
        </button>
        <p className="certificate-uploader__hint">{hint}</p>
      </div>
      <div className="certificate-uploader__status" aria-live="polite">
        {statusLabel}
      </div>
      {status === "uploading" && (
        <div className="certificate-uploader__progress">
          <span style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  );
}
