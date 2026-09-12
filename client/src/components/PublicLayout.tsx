import { BRAND_NAME } from "@shared/const";
import { Link, useLocation } from "wouter";

const GOLD = "#c9a900";

export function PublicLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const onLabReports = location.startsWith("/lab-reports");

  return (
    <div className="flex min-h-screen flex-col bg-white text-black">
      <div className="text-center" style={{ backgroundColor: GOLD }}>
        <Link
          href="/lab-reports"
          className="block px-4 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-80"
        >
          See all lab reports here
        </Link>
      </div>

      <header className="bg-black">
        <div className="container flex h-28 items-center justify-center">
          <Link href="/" aria-label={`${BRAND_NAME} home`}>
            <Logo className="h-12 sm:h-14" />
          </Link>
        </div>
      </header>

      <nav className="border-b border-black/10 bg-white">
        <div className="container flex items-center justify-center gap-1 py-1">
          <NavLink href="/lab-reports" active={onLabReports}>
            Lab Reports
          </NavLink>
          <NavLink href="/" active={!onLabReports}>
            Verify Your Code
          </NavLink>
        </div>
      </nav>

      <main className="flex-1">{children}</main>

      <SiteFooter />
    </div>
  );
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={[
        "border-b-[3px] px-4 py-3 text-[13px] font-bold uppercase tracking-wide transition-colors sm:text-sm",
        active ? "border-[#c9a900] text-black" : "border-transparent text-black/45 hover:text-black",
      ].join(" ")}
    >
      {children}
    </Link>
  );
}

/**
 * The white glow behind the mark is a filter rather than part of the artwork.
 * It is deliberately tight — it reads as a lit edge on the outline rather than
 * a halo spreading into the black around it. Doing it here instead of baking it
 * into the PNG keeps it crisp at whatever size the logo renders, and keeps the
 * file usable on a light background, where a baked white halo would be
 * invisible at best.
 */
function Logo({ className = "" }: { className?: string }) {
  return (
    <img
      src="/brand/logo.png"
      alt={BRAND_NAME}
      width={640}
      height={242}
      className={`w-auto ${className}`}
      style={{
        filter:
          "drop-shadow(0 0 1px rgba(255,255,255,0.85)) drop-shadow(0 0 2.5px rgba(255,255,255,0.4))",
      }}
    />
  );
}

function SiteFooter() {
  return (
    <footer className="mt-16">
      <div className="bg-black px-5 pb-8 pt-14 text-center">
        <Logo className="mx-auto h-9" />

        <div className="mx-auto mt-12 max-w-4xl">
          <p className="text-sm text-white">FDA Disclaimer:</p>
          <p className="mx-auto mt-4 max-w-3xl text-sm leading-relaxed text-white">
            This product has not been evaluated by the Food and Drug
            Administration. These statements have not been evaluated by the FDA.
            This product is not intended to diagnose, treat, cure, or prevent any
            disease or illness. Information about kratom and related products is
            available on the FDA website. Please read the FDA&apos;s advisories and
            comments on product concerns before use.
          </p>
          <hr className="mx-auto mt-10 max-w-4xl border-white/25" />
        </div>
      </div>

      <div className="px-5 py-3.5 text-center" style={{ backgroundColor: GOLD }}>
        <p className="text-sm font-bold text-white">
          Copyright &copy; {new Date().getFullYear()} &ndash; {BRAND_NAME} All Right
          Reserved
        </p>
      </div>
    </footer>
  );
}
