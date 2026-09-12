import { BRAND_NAME } from "@shared/const";
import { Link, useLocation } from "wouter";

const GOLD = "#c9a900";

export function PublicLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const onLabReports = location.startsWith("/lab-reports");

  return (
    <div className="flex min-h-screen flex-col bg-white text-black">
      {/* Announcement bar. It points at the reports page, so on that page it
          would link to itself; there it carries the batch-matching hint instead
          of disappearing and shifting the whole layout up. */}
      <div className="text-center" style={{ backgroundColor: GOLD }}>
        {onLabReports ? (
          <p className="px-4 py-2.5 text-sm font-bold text-white">
            Match the batch number on your package to the report
          </p>
        ) : (
          <Link
            href="/lab-reports"
            className="block px-4 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-80"
          >
            See all lab reports here
          </Link>
        )}
      </div>

      <header className="bg-black">
        <div className="container flex h-28 items-center justify-center">
          <Link href="/" aria-label={`${BRAND_NAME} home`}>
            <img
              src="/brand/logo.png"
              alt={BRAND_NAME}
              className="h-12 w-auto sm:h-14"
              width={640}
              height={242}
            />
          </Link>
        </div>
      </header>

      <nav className="border-b border-black/10 bg-white">
        <div className="container flex items-center justify-center gap-1 py-1">
          <NavLink href="/" active={!onLabReports}>
            Verify Your Code
          </NavLink>
          <NavLink href="/lab-reports" active={onLabReports}>
            Lab Reports
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

function SiteFooter() {
  return (
    <footer className="mt-16">
      <div className="bg-black px-5 pb-8 pt-14 text-center">
        <img
          src="/brand/logo.png"
          alt={BRAND_NAME}
          className="mx-auto h-9 w-auto"
          width={640}
          height={242}
        />

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
