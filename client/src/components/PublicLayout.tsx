import { BRAND_NAME, SUPPORT_EMAIL } from "@shared/const";
import { FlaskConical, ShieldCheck } from "lucide-react";
import { Link, useLocation } from "wouter";

const NAV = [
  { label: "Verify Your Code", href: "/", icon: ShieldCheck },
  { label: "Lab Reports", href: "/lab-reports", icon: FlaskConical },
];

/**
 * The whole public site is these two pages, so the nav is the nav — no menu
 * button, no collapse. Two links fit on a phone at full size, and hiding them
 * behind a hamburger would add a tap to the only two things anyone came for.
 */
export function PublicLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const isActive = (href: string) =>
    href === "/" ? location === "/" : location.startsWith(href);

  return (
    <div className="flex min-h-screen flex-col bg-[#e6eafc] text-[#1c2340]">
      <header className="sticky top-0 z-30 border-b border-[#1c2340]/10 bg-[#e6eafc]/85 backdrop-blur-md">
        <div className="container flex h-16 items-center gap-4">
          <Link
            href="/"
            className="text-base font-bold tracking-[0.22em] text-[#1c2340] uppercase"
          >
            {BRAND_NAME}
          </Link>
          <nav className="ml-auto flex items-center gap-1 sm:gap-2">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[13px] font-semibold transition-colors sm:px-4 sm:text-sm",
                  isActive(item.href)
                    ? "bg-[#1c2340] text-white"
                    : "text-[#1c2340]/70 hover:bg-white/70 hover:text-[#1c2340]",
                ].join(" ")}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="hidden xs:inline sm:inline">{item.label}</span>
                <span className="xs:hidden sm:hidden">
                  {item.href === "/" ? "Verify" : "Lab"}
                </span>
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-[#1c2340]/10 px-5 py-8 text-center text-xs text-[#1c2340]/55">
        <p>
          &copy; {new Date().getFullYear()} {BRAND_NAME}. All rights reserved.
        </p>
        <p className="mt-1.5">
          Questions about a code?{" "}
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="font-medium text-[#1c2340] underline underline-offset-4"
          >
            {SUPPORT_EMAIL}
          </a>
        </p>
      </footer>
    </div>
  );
}
