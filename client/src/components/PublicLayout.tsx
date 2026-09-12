import { BRAND_NAME, SUPPORT_EMAIL } from "@shared/const";
import { Link, useLocation } from "wouter";

/**
 * The brand is three flat colours — black, yellow, white — with no gradients and
 * no soft shadows. Cards are separated by a hairline border and a small amount
 * of elevation, nothing more, so the yellow stays the only thing on the page
 * that draws the eye.
 */
export function PublicLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const onLabReports = location.startsWith("/lab-reports");

  return (
    <div className="flex min-h-screen flex-col bg-white text-black">
      {/* Announcement bar. On the verification page it points at the reports;
          on the reports page itself that link would go nowhere, so it carries
          the support address instead of disappearing and shifting the layout. */}
      <div className="bg-[#d2bd00] text-center">
        {onLabReports ? (
          <p className="px-4 py-2.5 text-sm font-bold text-black">
            Questions about a batch?{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="underline underline-offset-2">
              {SUPPORT_EMAIL}
            </a>
          </p>
        ) : (
          <Link
            href="/lab-reports"
            className="block px-4 py-2.5 text-sm font-bold text-black transition-opacity hover:opacity-75"
          >
            See all lab reports here
          </Link>
        )}
      </div>

      <header className="bg-black">
        <div className="container flex h-24 items-center justify-center">
          <Link href="/" aria-label={`${BRAND_NAME} home`}>
            <Wordmark className="text-[2.25rem] sm:text-[2.5rem]" />
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

      <footer className="mt-16 bg-black px-5 py-10 text-center">
        <Wordmark className="justify-center text-[1.6rem]" />
        <p className="mt-5 text-xs text-white/45">
          &copy; {new Date().getFullYear()} {BRAND_NAME}. All rights reserved.
        </p>
        <p className="mt-1.5 text-xs text-white/45">
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="font-medium text-[#ffe81f] underline underline-offset-4"
          >
            {SUPPORT_EMAIL}
          </a>
        </p>
      </footer>
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
        active
          ? "border-[#d2bd00] text-black"
          : "border-transparent text-black/45 hover:text-black",
      ].join(" ")}
    >
      {children}
    </Link>
  );
}

/**
 * Text wordmark standing in for the real logo file. Swapping it for the artwork
 * is one replacement here rather than an edit in the header and the footer.
 */
function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span
      className={`flex items-center font-display font-extrabold italic leading-none tracking-tight text-[#ffe81f] ${className}`}
    >
      9Tabz
    </span>
  );
}
