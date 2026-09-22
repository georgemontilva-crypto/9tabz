import { useState } from "react";

export type UploadedFile = {
  storageKey: string;
  publicUrl: string;
  fileName: string;
  sizeBytes: number;
  mimeType: string;
};

/**
 * Uploads a file through our own server, which stores it in R2.
 *
 * An earlier version had the browser PUT straight to a presigned R2 URL. That
 * saves a hop, but it only works when the bucket carries a CORS rule allowing
 * PUT from this origin — and when it doesn't, the browser blocks the request
 * before it is sent: no status code, nothing in the server logs, and an admin
 * with no way to tell a misconfigured bucket from a broken button.
 *
 * Going through the server is a same-origin request, so there is no preflight
 * and no bucket setting to get wrong. Lab reports run to a few megabytes; the
 * extra hop costs less than a failure nobody can diagnose.
 *
 * XMLHttpRequest rather than fetch, because it reports upload progress. The
 * admin is often on a phone tethered in a warehouse, and a spinner that never
 * moves is indistinguishable from a stall — the usual response to which is
 * pressing the button again.
 */
export function useR2Upload() {
  const [progress, setProgress] = useState<number | null>(null);

  const upload = async (
    file: File,
    kind: "lab-report" | "product-image"
  ): Promise<UploadedFile> => {
    setProgress(0);
    try {
      const mimeType = file.type || (kind === "lab-report" ? "application/pdf" : "image/jpeg");
      const url = `/api/upload?kind=${kind}&fileName=${encodeURIComponent(file.name)}`;

      return await new Promise<UploadedFile>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", url, true);
        xhr.setRequestHeader("Content-Type", mimeType);
        // The admin session is a cookie; without this the request is anonymous.
        xhr.withCredentials = true;

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
        };

        xhr.onload = () => {
          let payload: any = null;
          try {
            payload = JSON.parse(xhr.responseText);
          } catch {
            /* non-JSON error page */
          }
          if (xhr.status >= 200 && xhr.status < 300 && payload?.storageKey) {
            resolve(payload as UploadedFile);
          } else {
            // The server's own message where there is one: "Storage not
            // configured. Missing: R2_BUCKET" is actionable, "upload failed"
            // is not.
            reject(new Error(payload?.error ?? `Upload failed (HTTP ${xhr.status})`));
          }
        };
        xhr.onerror = () => reject(new Error("Upload failed: network error"));
        xhr.send(file);
      });
    } finally {
      setProgress(null);
    }
  };

  return { upload, progress, isUploading: progress !== null };
}
