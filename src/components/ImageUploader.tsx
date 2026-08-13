"use client";
/* eslint-disable @next/next/no-img-element */

import { ImagePlus, X } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  getListingImageLimitHint,
  listingImageMaxFileSizeBytes,
  listingImageMaxFileSizeMessage,
  listingImageMaxFiles,
  listingImageMaxFilesMessage
} from "@/lib/listing-images";

const defaultImageMaxFileSizeBytes = 5 * 1024 * 1024;
const allowedMimeTypes = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
const allowedExtensions = new Set(["jpg", "jpeg", "png", "webp"]);

function formatBytesInMb(bytes: number) {
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}

function isAllowedImage(file: File) {
  if (allowedMimeTypes.has(file.type)) {
    return true;
  }

  if (!file.type) {
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    return allowedExtensions.has(extension);
  }

  return false;
}

const listingUploadEndpoints = ["/dashboard/api/upload", "/api/uploads"];

function uploadEndpointsForFolder(folder: string) {
  if (folder.startsWith("classified-") || folder === "cargo-posts") {
    return listingUploadEndpoints;
  }
  return ["/api/uploads"];
}

function readUploadErrorMessage(
  result: { ok?: boolean; success?: boolean; message?: string; error?: { message?: string } } | null,
  response: Response
) {
  const message = result?.message ?? result?.error?.message;
  if (message?.includes("FormData") || response.status === 413) {
    return "Şəkil çox böyükdür və ya formatı dəstəklənmir. jpeg, png və ya webp seçin (maks. 150 MB).";
  }
  if (response.status >= 500) {
    return message || "Şəkil serverində xəta baş verdi. Başqa şəkil formatı ilə yenidən cəhd edin.";
  }
  return message ?? "Şəkil yüklənmədi.";
}

function formatUploadError(error: unknown) {
  if (!(error instanceof Error)) {
    return "Şəkil yüklənmədi.";
  }

  if (error.message === "Failed to fetch" || error.name === "TypeError") {
    return "Şəkil serverinə qoşulmaq mümkün olmadı. İnternet bağlantınızı yoxlayın və yenidən cəhd edin.";
  }

  return error.message;
}

export function ImageUploader({
  name,
  folder = "general",
  label = "Şəkil yüklə",
  multiple = true,
  initialUrls = [],
  maxFiles,
  maxFileSizeBytes = defaultImageMaxFileSizeBytes,
  helperText,
  onUrlsChange
}: {
  name?: string;
  folder?: string;
  label?: string;
  multiple?: boolean;
  initialUrls?: string[];
  /** @deprecated data-URL fallback breaks elan API validation — ignored */
  clientFallback?: boolean;
  maxFiles?: number;
  maxFileSizeBytes?: number;
  helperText?: string;
  onUrlsChange?: (urls: string[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [urls, setUrls] = useState<string[]>(initialUrls);
  const [erroredUrls, setErroredUrls] = useState<Set<string>>(() => new Set());
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const limitHint =
    helperText ??
    (maxFiles === listingImageMaxFiles && maxFileSizeBytes === listingImageMaxFileSizeBytes
      ? getListingImageLimitHint()
      : `jpg, png və webp faylları${maxFiles ? ` • maksimum ${maxFiles} şəkil` : ""}${maxFileSizeBytes ? ` • hər biri maksimum ${formatBytesInMb(maxFileSizeBytes)}` : ""}`);

  function commitUrls(next: string[]) {
    setUrls(next);
    // Reset error state for urls that are no longer present.
    setErroredUrls((prev) => {
      const nextSet = new Set(next);
      const filtered = new Set<string>();
      for (const u of prev) {
        if (nextSet.has(u)) filtered.add(u);
      }
      return filtered;
    });
    onUrlsChange?.(next);
  }

  async function upload(incomingFiles: File[]) {
    if (!incomingFiles.length) {
      return;
    }

    if (maxFiles && multiple && urls.length + incomingFiles.length > maxFiles) {
      setError(maxFiles === listingImageMaxFiles ? listingImageMaxFilesMessage : `Maksimum ${maxFiles} şəkil əlavə edə bilərsiniz.`);
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const uploaded: string[] = [];
      const endpoints = uploadEndpointsForFolder(folder);

      for (const file of incomingFiles) {
        if (!isAllowedImage(file)) {
          throw new Error("Yalnız jpg, jpeg, png və webp şəkillər qəbul edilir.");
        }

        if (file.size > maxFileSizeBytes) {
          if (maxFileSizeBytes === listingImageMaxFileSizeBytes) {
            throw new Error(listingImageMaxFileSizeMessage);
          }

          throw new Error(`Şəkil ölçüsü maksimum ${formatBytesInMb(maxFileSizeBytes)} ola bilər.`);
        }

        let lastError: Error | null = null;
        let savedUrl: string | null = null;

        for (const endpoint of endpoints) {
          const attemptData = new FormData();
          attemptData.append("file", file);
          attemptData.append("folder", folder);

          try {
            const response = await fetch(endpoint, {
              method: "POST",
              body: attemptData,
              credentials: "include"
            });

            let result: {
              ok?: boolean;
              success?: boolean;
              message?: string;
              data?: { url?: string };
            } | null = null;

            try {
              result = await response.json();
            } catch {
              result = null;
            }

            const url = result?.data?.url;
            if (response.ok && (result?.ok || result?.success) && url && url.startsWith("/uploads/")) {
              savedUrl = url;
              break;
            }

            lastError = new Error(readUploadErrorMessage(result, response));
          } catch (attemptError) {
            lastError = attemptError instanceof Error ? attemptError : new Error("Şəkil yüklənmədi.");
          }
        }

        if (!savedUrl) {
          throw lastError ?? new Error("Şəkil yüklənmədi.");
        }

        uploaded.push(savedUrl);
      }

      const nextUrls = !multiple
        ? uploaded.slice(0, 1)
        : maxFiles
          ? [...urls, ...uploaded].slice(0, maxFiles)
          : [...urls, ...uploaded];
      commitUrls(nextUrls);
    } catch (uploadError) {
      setError(formatUploadError(uploadError));
    } finally {
      setIsUploading(false);
    }
  }

  function removeUrl(url: string) {
    commitUrls(urls.filter((item) => item !== url));
  }

  function openPicker(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (isUploading) {
      return;
    }
    inputRef.current?.click();
  }

  return (
    <div
      className="space-y-3"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          event.stopPropagation();
        }
      }}
    >
      {name ? <input type="hidden" name={name} value={JSON.stringify(urls)} readOnly /> : null}
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept="image/jpeg,image/jpg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
        multiple={multiple}
        tabIndex={-1}
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = "";
          void upload(files);
        }}
      />

      <button
        type="button"
        disabled={isUploading}
        onClick={openPicker}
        className="flex min-h-32 w-full cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-navy-100 bg-slate-50 px-4 py-6 text-center transition hover:border-logistics-orange hover:bg-orange-50/40 disabled:cursor-wait disabled:opacity-70"
      >
        <ImagePlus className="mb-3 h-8 w-8 text-logistics-orange" aria-hidden />
        <span className="text-sm font-semibold text-navy-900">{label}</span>
        <span className="mt-1 text-xs text-slate-500">{limitHint}</span>
      </button>

      {isUploading ? <p className="text-sm text-slate-500">Şəkil yüklənir...</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {maxFiles ? <p className="text-xs text-slate-500">{urls.length}/{maxFiles} şəkil</p> : null}

      {urls.length ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {urls.map((url, index) => (
            <div key={`${url.slice(0, 48)}-${index}`} className="relative overflow-hidden rounded-lg border border-navy-100 bg-white">
              {!erroredUrls.has(url) ? (
                <img
                  src={url}
                  alt="Yüklənmiş şəkil"
                  className="h-28 w-full object-cover"
                  onError={() => {
                    setErroredUrls((prev) => {
                      const next = new Set(prev);
                      next.add(url);
                      return next;
                    });
                  }}
                />
              ) : (
                <div className="flex h-28 w-full items-center justify-center bg-slate-50">
                  <ImagePlus className="h-6 w-6 text-slate-300" aria-hidden />
                </div>
              )}
              <Button
                type="button"
                variant="secondary"
                className="absolute right-2 top-2 h-8 min-h-0 w-8 rounded-full p-0"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  removeUrl(url);
                }}
                aria-label="Şəkli sil"
              >
                <X className="h-4 w-4" aria-hidden />
              </Button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
