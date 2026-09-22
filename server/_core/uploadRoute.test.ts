import express from "express";
import http, { type Server } from "http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Exercises the upload route over a real socket. The storage layer is the only
 * thing stubbed — everything else (Express body handling, the auth cookie, the
 * PDF sniff) runs for real, because those are exactly the parts that were
 * silently failing before.
 */

const stored: { key: string; size: number; contentType: string }[] = [];

vi.mock("../storage", () => ({
  isStorageConfigured: () => true,
  missingStorageVars: () => [],
  storagePut: async (key: string, data: Buffer, contentType: string) => {
    stored.push({ key, size: data.length, contentType });
    return { key: `${key}-abc123`, url: `https://cdn.example.com/${key}-abc123` };
  },
}));

let adminSession = true;
vi.mock("../auth", () => ({
  getAdminSessionToken: () => (adminSession ? "token" : undefined),
  verifyAppSession: async (token: string | undefined) =>
    token ? { sub: 1, kind: "admin", email: "a@b.c" } : null,
}));

const { registerUploadRoute } = await import("./uploadRoute");

let server: Server | null = null;
let port = 0;

beforeEach(async () => {
  stored.length = 0;
  adminSession = true;
  const app = express();
  // Mirrors production: the JSON parser is registered first and must not
  // swallow the binary body.
  app.use(express.json({ limit: "50mb" }));
  registerUploadRoute(app);
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const a = server!.address();
      port = typeof a === "object" && a ? a.port : 0;
      resolve();
    });
  });
});

afterEach(async () => {
  if (server) {
    await new Promise<void>((resolve) => server!.close(() => resolve()));
    server = null;
  }
});

function post(
  path: string,
  body: Buffer,
  contentType: string
): Promise<{ status: number; json: any }> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: "127.0.0.1",
        port,
        path,
        method: "POST",
        headers: { "Content-Type": contentType, "Content-Length": body.length },
      },
      (res) => {
        let raw = "";
        res.on("data", (c) => (raw += c));
        res.on("end", () => {
          let json: any = null;
          try {
            json = JSON.parse(raw);
          } catch {
            /* ignore */
          }
          resolve({ status: res.statusCode ?? 0, json });
        });
      }
    );
    req.on("error", reject);
    req.end(body);
  });
}

const PDF = Buffer.concat([Buffer.from("%PDF-1.7\n"), Buffer.alloc(2048, 0x20)]);

describe("upload route", () => {
  it("stores a PDF and returns the key, url and size", async () => {
    const res = await post("/api/upload?kind=lab-report&fileName=COA.pdf", PDF, "application/pdf");
    expect(res.status).toBe(200);
    expect(res.json.storageKey).toContain("lab-reports/COA.pdf");
    expect(res.json.publicUrl).toContain("https://cdn.example.com/");
    expect(res.json.sizeBytes).toBe(PDF.length);
    // The whole body reached storage: the JSON parser didn't eat the stream.
    expect(stored[0].size).toBe(PDF.length);
    expect(stored[0].contentType).toBe("application/pdf");
  });

  it("rejects a file that isn't really a PDF", async () => {
    const res = await post(
      "/api/upload?kind=lab-report&fileName=notes.pdf",
      Buffer.from("<html>404 Not Found</html>"),
      "application/pdf"
    );
    expect(res.status).toBe(400);
    expect(res.json.error).toMatch(/valid PDF/i);
    expect(stored).toHaveLength(0);
  });

  it("rejects a non-PDF content type for a lab report", async () => {
    const res = await post("/api/upload?kind=lab-report&fileName=a.png", PDF, "image/png");
    expect(res.status).toBe(400);
    expect(stored).toHaveLength(0);
  });

  it("rejects an unknown kind", async () => {
    const res = await post("/api/upload?kind=whatever&fileName=a.pdf", PDF, "application/pdf");
    expect(res.status).toBe(400);
  });

  it("rejects an empty body", async () => {
    const res = await post(
      "/api/upload?kind=lab-report&fileName=a.pdf",
      Buffer.alloc(0),
      "application/pdf"
    );
    expect(res.status).toBe(400);
  });

  it("requires an admin session", async () => {
    adminSession = false;
    const res = await post("/api/upload?kind=lab-report&fileName=a.pdf", PDF, "application/pdf");
    expect(res.status).toBe(401);
    expect(stored).toHaveLength(0);
  });

  it("sanitises the filename into the storage key", async () => {
    await post(
      "/api/upload?kind=lab-report&fileName=" + encodeURIComponent("../../etc/pa ss wd.pdf"),
      PDF,
      "application/pdf"
    );
    expect(stored[0].key).not.toContain("..");
    expect(stored[0].key).not.toContain(" ");
  });

  it("accepts an image for a product image", async () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const res = await post("/api/upload?kind=product-image&fileName=berry.png", png, "image/png");
    expect(res.status).toBe(200);
    expect(stored[0].key).toContain("product-images/berry.png");
  });
});
