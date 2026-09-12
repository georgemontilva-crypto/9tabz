import { PublicLayout } from "@/components/PublicLayout";
import { trpc } from "@/lib/trpc";
import { FileText, Loader2 } from "lucide-react";

type Report = {
  id: number;
  title: string;
  batch: string | null;
  lab: string | null;
  testedOn: string | null;
  fileUrl: string;
  fileName: string | null;
  sizeBytes: number | null;
};

type Product = {
  id: number;
  name: string;
  collection: string | null;
  subtitle: string | null;
  imageUrl: string | null;
  reports: Report[];
};

export default function LabReports() {
  const { data, isLoading } = trpc.catalog.publicReports.useQuery();
  const products = (data ?? []).filter((p) => p.reports.length > 0) as Product[];

  // Group into product lines, preserving the order the server sorted them in so
  // sortOrder in the admin panel controls the page.
  const groups: { name: string; items: Product[] }[] = [];
  for (const product of products) {
    const key = product.collection?.trim() || "Other products";
    const existing = groups.find((g) => g.name === key);
    if (existing) existing.items.push(product);
    else groups.push({ name: key, items: [product] });
  }

  return (
    <PublicLayout>
      <div className="container py-12">
        {isLoading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="h-6 w-6 animate-spin text-black/30" />
          </div>
        ) : groups.length === 0 ? (
          <div className="mx-auto max-w-md border border-black/10 p-12 text-center">
            <FileText className="mx-auto h-8 w-8 text-black/20" />
            <p className="mt-4 text-sm text-black/55">
              No lab reports have been published yet. Check back soon.
            </p>
          </div>
        ) : (
          <div className="space-y-14">
            {groups.map((group) => (
              <section key={group.name}>
                <h2 className="font-display text-2xl font-extrabold uppercase tracking-tight sm:text-3xl">
                  {group.name}
                </h2>
                <div className="mt-7 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {group.items.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </PublicLayout>
  );
}

function ProductCard({ product }: { product: Product }) {
  // One report is the common case and gets a single plain link, matching the
  // rest of the card. Several need to be told apart, so they become a list
  // labelled by batch.
  const single = product.reports.length === 1 ? product.reports[0] : null;

  return (
    <article className="flex gap-5 border border-black/8 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
      <div className="flex h-28 w-28 shrink-0 items-center justify-center bg-[#f4f4f4]">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="h-full w-full object-contain p-2"
          />
        ) : (
          <FileText className="h-7 w-7 text-black/15" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="font-display text-lg font-extrabold uppercase tracking-tight">
          {product.name}
        </h3>
        {product.subtitle && (
          <p className="mt-1.5 text-sm leading-snug text-black/45">{product.subtitle}</p>
        )}

        {single ? (
          <a
            href={single.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-block text-sm font-bold uppercase tracking-wide underline underline-offset-4 decoration-2 hover:text-[#a89800]"
          >
            See lab report
          </a>
        ) : (
          <ul className="mt-4 space-y-2">
            {product.reports.map((r) => (
              <li key={r.id}>
                <a
                  href={r.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-bold uppercase tracking-wide underline underline-offset-4 decoration-2 hover:text-[#a89800]"
                >
                  {r.batch ? `Batch ${r.batch}` : r.title}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}
