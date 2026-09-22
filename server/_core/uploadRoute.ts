import type { Express, Request, Response } from "express";
import express from "express";
import { getAdminSessionToken, verifyAppSession } from "../auth";
import { isStorageConfigured, missingStorageVars, storagePut } from "../storage";

/**
 * Server-side upload endpoint.
 *
 * The presigned-PUT flow has the browser talk straight to R2, which is cheaper
 * on our bandwidth but only works if the bucket carries a CORS rule allowing
 * PUT from this origin. That rule is invisible from inside the app: without it
 * the browser refuses the request before it leaves the machine, the upload
 * reports a network error with no status, and nothing reaches the server logs.
 *
 * Routing the bytes through here removes that dependency entirely — it is a
 * same-origin request to our own server, so there is no preflight and no bucket
 * configuration to get wrong. Lab reports are a few megabytes, so the cost of
 * the extra hop is not worth a silent failure mode nobody can diagnose from the
 * admin panel.
 */

/** Big enough for a scanned multi-page COA, small enough to hold in memory. */
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

function safeFileName(name: string): string {
  const cleaned = name
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    // Path separators are already gone, so ".." can't traverse anywhere — but
    // it still ends up in the object key, and a key littered with dot runs is
    // noise when reading the bucket later.
    .replace(/\.{2,}/g, ".")
    .replace(/^[._-]+/, "")
    .slice(0, 120);
  return cleaned || "upload";
}

export function registerUploadRoute(app: Express): void {
  app.post(
    "/api/upload",
    express.raw({ type: "*/*", limit: MAX_UPLOAD_BYTES }),
    async (req: Request, res: Response) => {
      const session = await verifyAppSession(getAdminSessionToken(req), "admin");
      if (!session) {
        res.status(401).json({ error: "Admin authentication required" });
        return;
      }

      if (!isStorageConfigured()) {
        res
          .status(503)
          .json({ error: `Storage not configured. Missing: ${missingStorageVars().join(", ")}` });
        return;
      }

      const kind = String(req.query.kind ?? "");
      if (kind !== "lab-report" && kind !== "product-image") {
        res.status(400).json({ error: "Unknown upload kind" });
        return;
      }

      const fileName = safeFileName(String(req.query.fileName ?? "upload"));
      const mimeType = String(req.headers["content-type"] ?? "application/octet-stream");

      if (kind === "lab-report" && mimeType !== "application/pdf") {
        res.status(400).json({ error: "Lab reports must be PDF files" });
        return;
      }
      if (kind === "product-image" && !mimeType.startsWith("image/")) {
        res.status(400).json({ error: "Product images must be image files" });
        return;
      }

      const body = req.body as Buffer;
      if (!Buffer.isBuffer(body) || body.length === 0) {
        res.status(400).json({ error: "Empty upload" });
        return;
      }

      // A PDF always starts with %PDF. Catching it here means a mislabelled file
      // fails with a clear message instead of being stored and only discovered
      // when a customer opens a COA that won't render.
      if (kind === "lab-report" && body.subarray(0, 4).toString("ascii") !== "%PDF") {
        res.status(400).json({ error: "That file isn't a valid PDF" });
        return;
      }

      try {
        const { key, url } = await storagePut(`${kind}s/${fileName}`, body, mimeType);
        res.json({ storageKey: key, publicUrl: url, fileName, sizeBytes: body.length, mimeType });
      } catch (err) {
        console.error("[Upload] failed:", err);
        res.status(502).json({
          error: err instanceof Error ? err.message : "Upload to storage failed",
        });
      }
    }
  );
}
