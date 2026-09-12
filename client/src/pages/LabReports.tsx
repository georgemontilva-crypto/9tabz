import { PublicLayout } from "@/components/PublicLayout";
import { trpc } from "@/lib/trpc";
import { Download, FileText, Loader2 } from "lucide-react";

function formatSize(bytes?: number | null): string | null {
  if (!bytes || bytes <= 0) return null;
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export default function LabReports() {
  const { data, isLoading } = trpc.catalog.publicReports.useQuery();
  const products = data ?? [];
  const withReports = products.filter((p) => p.reports.length > 0);

  return (
    <PublicLayout>
      <div className="container max-w-3xl py-12">
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Lab Reports
        </h1>
        <p className="mt-3 max-w-lg text-sm leading-relaxed text-[#1c2340]/65">
          Certificates of analysis for every batch, straight from the testing lab.
          Match the batch number on your package to the report below.
        </p>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-[#1c2340]/40" />
          </div>
        ) : withReports.length === 0 ? (
          <div className="mt-10 rounded-3xl bg-white/70 p-10 text-center">
            <FileText className="mx-auto h-8 w-8 text-[#1c2340]/30" />
            <p className="mt-4 text-sm text-[#1c2340]/60">
              No lab reports have been published yet. Check back soon.
            </p>
          </div>
        ) : (
          <div className="mt-10 space-y-8">
            {withReports.map((product) => (
              <section key={product.id}>
                <div className="flex items-center gap-4">
                  {product.imageUrl && (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="h-14 w-14 shrink-0 rounded-xl bg-white object-contain p-1.5"
                    />
                  )}
                  <div className="min-w-0">
                    <h2 className="font-display text-xl font-bold tracking-tight">
                      {product.name}
                    </h2>
                    {product.subtitle && (
                      <p className="text-sm text-[#1c2340]/60">{product.subtitle}</p>
                    )}
                  </div>
                </div>

                {product.description && (
                  <p className="mt-3 text-sm leading-relaxed text-[#1c2340]/65">
                    {product.description}
                  </p>
                )}

                <ul className="mt-4 divide-y divide-[#1c2340]/10 overflow-hidden rounded-2xl bg-white/70">
                  {product.reports.map((report) => {
                    const size = formatSize(report.sizeBytes);
                    const meta = [
                      report.batch ? `Batch ${report.batch}` : null,
                      report.lab,
                      report.testedOn,
                      size,
                    ]
                      .filter(Boolean)
                      .join(" · ");

                    return (
                      <li key={report.id}>
                        <a
                          href={report.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-white"
                        >
                          <FileText className="h-5 w-5 shrink-0 text-[#1c2340]/40" />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-semibold">
                              {report.title}
                            </div>
                            {meta && (
                              <div className="mt-0.5 truncate text-xs text-[#1c2340]/55">
                                {meta}
                              </div>
                            )}
                          </div>
                          <Download className="h-4 w-4 shrink-0 text-[#1c2340]/40" />
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
