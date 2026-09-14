import express from "express";
import http, { type Server } from "http";
import { afterEach, describe, expect, it } from "vitest";
import { registerCanonicalHostRedirect } from "./canonicalHost";

/**
 * These run against a real Express app on a real socket rather than a mocked
 * request: the thing under test is how Express itself resolves `Host` and
 * `originalUrl`, which a hand-built fake object would simply assert into
 * existence.
 */

let server: Server | null = null;

let port = 0;

function start(env: Record<string, string | undefined>): Promise<string> {
  const previous = { ...process.env };
  // Assigning undefined to process.env stores the string "undefined", so an
  // unset variable has to be deleted rather than overwritten.
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }

  const app = express();
  registerCanonicalHostRedirect(app);
  app.use((_req, res) => res.status(200).send("served"));

  for (const key of Object.keys(env)) {
    if (previous[key] === undefined) delete process.env[key];
    else process.env[key] = previous[key] as string;
  }

  return new Promise((resolve) => {
    server = app.listen(0, () => {
      const address = server!.address();
      port = typeof address === "object" && address ? address.port : 0;
      resolve(`http://127.0.0.1:${port}`);
    });
  });
}

afterEach(async () => {
  if (server) {
    await new Promise<void>((resolve) => server!.close(() => resolve()));
    server = null;
  }
});

const ENV = {
  CANONICAL_HOST: "www.get9tabz.com",
  ALIAS_HOSTS: "pop9tabz.com,www.pop9tabz.com",
};

/**
 * Raw http.request rather than fetch: undici treats Host as a forbidden header
 * and silently drops it, so every request would arrive as 127.0.0.1 and the
 * alias branch would never be exercised — the tests would pass by never
 * reaching the code they are meant to cover.
 */
function req(
  _base: string,
  path: string,
  host: string
): Promise<{ status: number; location: string | null }> {
  return new Promise((resolve, reject) => {
    const r = http.request(
      { host: "127.0.0.1", port, path, method: "GET", headers: { Host: host } },
      (res) => {
        res.resume();
        res.on("end", () =>
          resolve({
            status: res.statusCode ?? 0,
            location: (res.headers.location as string | undefined) ?? null,
          })
        );
      }
    );
    r.on("error", reject);
    r.end();
  });
}

describe("canonical host redirect", () => {
  it("redirects an alias host and keeps the path", async () => {
    const base = await start(ENV);
    const res = await req(base, "/verify", "pop9tabz.com");
    expect(res.status).toBe(301);
    expect(res.location).toBe("https://www.get9tabz.com/verify");
  });

  it("keeps the query string, so a printed QR code survives the hop", async () => {
    const base = await start(ENV);
    const res = await req(base, "/verify?code=ABCD12345", "pop9tabz.com");
    expect(res.location).toBe(
      "https://www.get9tabz.com/verify?code=ABCD12345"
    );
  });

  it("matches the alias regardless of case or port", async () => {
    const base = await start(ENV);
    const res = await req(base, "/", "POP9TABZ.com:443");
    expect(res.status).toBe(301);
  });

  it("covers the www form of the alias too", async () => {
    const base = await start(ENV);
    const res = await req(base, "/", "www.pop9tabz.com");
    expect(res.status).toBe(301);
  });

  it("serves the canonical host normally", async () => {
    const base = await start(ENV);
    const res = await req(base, "/verify", "www.get9tabz.com");
    expect(res.status).toBe(200);
  });

  it("serves any other host normally, so Railway's own URL still works", async () => {
    const base = await start(ENV);
    const res = await req(base, "/", "9tabz-production.up.railway.app");
    expect(res.status).toBe(200);
  });

  it("does nothing when CANONICAL_HOST is unset", async () => {
    const base = await start({ CANONICAL_HOST: undefined, ALIAS_HOSTS: ENV.ALIAS_HOSTS });
    const res = await req(base, "/", "pop9tabz.com");
    expect(res.status).toBe(200);
  });

  it("never redirects the canonical host to itself", async () => {
    // A copy-paste that lists the canonical host among the aliases would
    // otherwise send every request into an infinite redirect.
    const base = await start({
      CANONICAL_HOST: "www.get9tabz.com",
      ALIAS_HOSTS: "www.get9tabz.com,pop9tabz.com",
    });
    const res = await req(base, "/", "www.get9tabz.com");
    expect(res.status).toBe(200);
  });
});
