import type { Express, NextFunction, Request, Response } from "express";

/**
 * Redirects alias domains to the canonical one, preserving path and query.
 *
 * Doing this in the app rather than at the DNS layer means every route works
 * without touching DNS again: `/verify`, `/verify?code=ABC` and anything added
 * later all follow automatically. A DNS-level forward would have to be
 * configured per path, and a bare CNAME would serve the whole site on both
 * domains, which splits search ranking and — more to the point here — means a
 * QR code could resolve to either hostname depending on what was printed.
 *
 * Configured with:
 *   CANONICAL_HOST=www.get9tabz.com
 *   ALIAS_HOSTS=pop9tabz.com,www.pop9tabz.com
 *
 * With CANONICAL_HOST unset the middleware does nothing, so local development
 * and preview deploys are unaffected.
 */

function normalizeHost(host: string | undefined): string {
  if (!host) return "";
  // Host carries the port on non-standard ports; the comparison is on name only.
  return host.split(":")[0].trim().toLowerCase();
}

function parseList(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((h) => normalizeHost(h))
    .filter(Boolean);
}

export function registerCanonicalHostRedirect(app: Express): void {
  const canonical = normalizeHost(process.env.CANONICAL_HOST);
  if (!canonical) return;

  const aliasList = parseList(process.env.ALIAS_HOSTS).filter((h) => h !== canonical);
  if (aliasList.length === 0) return;
  const aliases = new Set(aliasList);

  console.log(
    `[Redirect] ${aliasList.join(", ")} → https://${canonical} (path and query preserved)`
  );

  app.use((req: Request, res: Response, next: NextFunction) => {
    const host = normalizeHost(req.headers.host);
    if (!aliases.has(host)) return next();

    // req.originalUrl is the path plus query exactly as received, before any
    // router has consumed part of it — which matters because this runs ahead of
    // the tRPC mount and the static handler.
    const target = `https://${canonical}${req.originalUrl}`;

    // 301 so browsers and search engines treat the canonical host as the real
    // one. It is cached hard, so the alias cannot later serve its own content
    // without users clearing it — which is the intent here, but worth knowing
    // before pointing a domain that is still in use.
    res.redirect(301, target);
  });
}
