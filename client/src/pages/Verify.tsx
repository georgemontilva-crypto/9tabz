import { PublicLayout } from "@/components/PublicLayout";
import { trpc } from "@/lib/trpc";
import { BRAND_NAME, SUPPORT_EMAIL } from "@shared/const";
import { AlertTriangle, Check, Loader2, RotateCcw } from "lucide-react";
import { useState } from "react";

type VerifyResult = {
  valid: boolean;
  code: string;
  product?: { name: string; subtitle: string | null; imageUrl: string | null } | null;
  batch?: string | null;
  verificationCount?: number;
  maxVerifications?: number;
  previouslyVerified?: boolean;
  firstVerifiedAt?: Date | null;
};

export default function Verify() {
  // Prefilled from ?code= so a QR on the package can land straight on the result
  // without the customer retyping what the sticker already told the phone.
  const [code, setCode] = useState(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("code") ?? "";
  });
  const [result, setResult] = useState<VerifyResult | null>(null);

  const verify = trpc.codes.verify.useMutation({
    onSuccess: (data) => setResult(data as VerifyResult),
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) return;
    setResult(null);
    verify.mutate({ code: trimmed });
  };

  const reset = () => {
    setResult(null);
    setCode("");
    verify.reset();
  };

  return (
    <PublicLayout>
      <div className="container flex min-h-[calc(100vh-10rem)] max-w-xl flex-col justify-center py-10">
        {result ? (
          <ResultView result={result} onReset={reset} />
        ) : (
          <div className="text-center">
            <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Product Authentication
            </h1>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-[#1c2340]/65">
              Scratch the security label on your {BRAND_NAME} product and enter the
              code below exactly as it appears.
            </p>

            <form onSubmit={onSubmit} className="mt-8 rounded-3xl bg-white/70 p-5 shadow-sm sm:p-6">
              <label
                htmlFor="code"
                className="block text-left text-xs font-bold uppercase tracking-wider text-[#1c2340]/60"
              >
                Verification code
              </label>
              <input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="ABCD12345"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                className="mt-2 w-full rounded-2xl border border-[#1c2340]/15 bg-white px-4 py-4 text-center font-mono text-lg tracking-[0.2em] uppercase outline-none transition placeholder:tracking-normal placeholder:text-[#1c2340]/25 focus:border-[#1c2340]/50 focus:ring-4 focus:ring-[#1c2340]/5"
              />
              <button
                type="submit"
                disabled={verify.isPending || !code.trim()}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1c2340] px-6 py-4 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                {verify.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Checking
                  </>
                ) : (
                  "Verify"
                )}
              </button>

              {verify.isError && (
                <p className="mt-3 text-sm text-red-600">
                  Something went wrong. Please try again in a moment.
                </p>
              )}
            </form>

            <p className="mt-6 text-xs leading-relaxed text-[#1c2340]/50">
              Each code can be checked a limited number of times. If yours has
              already been used up, contact{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="underline underline-offset-2">
                {SUPPORT_EMAIL}
              </a>
              .
            </p>
          </div>
        )}
      </div>
    </PublicLayout>
  );
}

/* ─── Result ──────────────────────────────────────────────────────────────── */

function ResultView({ result, onReset }: { result: VerifyResult; onReset: () => void }) {
  return result.valid ? (
    <AuthenticResult result={result} onReset={onReset} />
  ) : (
    <InvalidResult result={result} onReset={onReset} />
  );
}

function AuthenticResult({ result, onReset }: { result: VerifyResult; onReset: () => void }) {
  const used = result.verificationCount ?? 1;
  const max = result.maxVerifications ?? 3;
  const remaining = Math.max(0, max - used);

  return (
    <div className="text-center">
      {result.product?.imageUrl && (
        <img
          src={result.product.imageUrl}
          alt={result.product.name}
          className="mx-auto mb-6 h-28 w-auto rounded-xl object-contain"
        />
      )}

      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#c9ecd6]">
        <Check className="h-10 w-10 text-[#1f9d55]" strokeWidth={3} />
      </div>

      <h1 className="mt-6 font-display text-3xl font-bold uppercase tracking-tight sm:text-4xl">
        This Product Is Authentic
      </h1>
      <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-[#1c2340]/65">
        This product has been successfully authenticated by {BRAND_NAME}.
      </p>

      <dl className="mt-8 divide-y divide-[#1c2340]/10 rounded-2xl bg-white/70 px-5 text-sm">
        {result.product && (
          <Row label="Product">
            {result.product.name}
            {result.product.subtitle ? ` — ${result.product.subtitle}` : ""}
          </Row>
        )}
        <Row label="Code">
          <span className="font-mono tracking-widest">{result.code}</span>
        </Row>
        {result.batch && <Row label="Batch">{result.batch}</Row>}
        <Row label="Status">Authentic</Row>
      </dl>

      {/* Shown from the second check onward. A genuine buyer checking their own
          purchase sees this once, at most; a shopper seeing it on a sealed unit
          in a shop is looking at a label that someone has already scanned. */}
      {result.previouslyVerified && (
        <div className="mt-4 rounded-2xl bg-[#f5e6c8]/70 px-5 py-4 text-sm">
          <p className="font-bold">Previously verified</p>
          <p className="mt-1 text-[#1c2340]/70">
            This code has been verified before.
            <br />
            Verification count: <strong>{used}</strong> of {max}
          </p>
          {result.firstVerifiedAt && (
            <p className="mt-1 text-xs text-[#1c2340]/55">
              First checked {new Date(result.firstVerifiedAt).toLocaleDateString()}
            </p>
          )}
        </div>
      )}

      <p className="mt-4 text-xs text-[#1c2340]/50">
        {remaining > 0
          ? `${remaining} check${remaining === 1 ? "" : "s"} remaining on this code.`
          : "This was the last check available on this code."}
      </p>

      <button
        onClick={onReset}
        className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-[#1c2340]/70 underline underline-offset-4 hover:text-[#1c2340]"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        Verify another product
      </button>
    </div>
  );
}

/**
 * One screen for every failure.
 *
 * It deliberately doesn't say which kind of failure it was. A code that is out
 * of checks and a code that never existed look identical here, so someone
 * feeding in copied labels learns nothing about which of them came off a real
 * package. The retry steps come first because a mistyped character is by far
 * the most common reason a real customer lands on this screen.
 */
function InvalidResult({ result, onReset }: { result: VerifyResult; onReset: () => void }) {
  return (
    <div className="text-center">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#f7d9d9]">
        <AlertTriangle className="h-9 w-9 text-[#c0392b]" strokeWidth={2.5} />
      </div>

      <h1 className="mt-6 font-display text-3xl font-bold uppercase tracking-tight sm:text-4xl">
        Code Not Valid
      </h1>
      <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-[#1c2340]/65">
        We couldn&apos;t verify{" "}
        <span className="font-mono font-semibold tracking-widest text-[#1c2340]">
          {result.code}
        </span>
        . Before assuming the worst, try this:
      </p>

      <ol className="mx-auto mt-6 max-w-sm space-y-3 rounded-2xl bg-white/70 p-5 text-left text-sm text-[#1c2340]/75">
        <li className="flex gap-3">
          <span className="font-bold text-[#1c2340]">1.</span>
          Check the code character by character. Zero and the letter O are easy to
          confuse, as are one and the letter I.
        </li>
        <li className="flex gap-3">
          <span className="font-bold text-[#1c2340]">2.</span>
          Make sure the whole label is scratched off, so no character is hidden.
        </li>
        <li className="flex gap-3">
          <span className="font-bold text-[#1c2340]">3.</span>
          If it still doesn&apos;t work, send us a photo of the label and of the
          product and we&apos;ll look into it.
        </li>
      </ol>

      <a
        href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
          `Code verification: ${result.code}`
        )}`}
        className="mt-6 inline-flex items-center justify-center rounded-2xl bg-[#1c2340] px-6 py-3.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
      >
        Contact us about this code
      </a>

      <p className="mx-auto mt-5 max-w-sm text-xs leading-relaxed text-[#1c2340]/50">
        If you bought this product from an unauthorised seller, it may be
        counterfeit. Genuine {BRAND_NAME} products are only sold through approved
        retailers.
      </p>

      <button
        onClick={onReset}
        className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-[#1c2340]/70 underline underline-offset-4 hover:text-[#1c2340]"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        Verify another product
      </button>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-6 py-3.5 text-left">
      <dt className="shrink-0 text-[#1c2340]/55">{label}</dt>
      <dd className="text-right font-medium">{children}</dd>
    </div>
  );
}
