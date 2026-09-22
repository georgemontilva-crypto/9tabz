import { AdminLayout, Card, Field, buttonClass, inputClass } from "@/components/AdminLayout";
import { useR2Upload } from "@/hooks/useR2Upload";
import { trpc } from "@/lib/trpc";
import { ChevronDown, ChevronRight, Eye, EyeOff, FileText, Loader2, Save, Trash2, Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

function formatSize(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return "—";
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export default function AdminLabReports() {
  const utils = trpc.useUtils();
  const products = trpc.catalog.adminProducts.useQuery(undefined, { retry: false });

  const [productId, setProductId] = useState<number | "">("");
  const [title, setTitle] = useState("");
  const [batch, setBatch] = useState("");
  const [lab, setLab] = useState("");
  const [testedOn, setTestedOn] = useState("");
  const [file, setFile] = useState<File | null>(null);
  // Reports already hosted elsewhere (the WordPress uploads folder, say) can be
  // linked instead of re-uploaded, so the same PDF isn't stored twice.
  const [mode, setMode] = useState<"upload" | "link">("upload");
  const [externalUrl, setExternalUrl] = useState("");

  const { upload, progress, isUploading } = useR2Upload();

  const refresh = () => {
    utils.catalog.adminProducts.invalidate();
    utils.catalog.publicReports.invalidate();
    utils.adminAuth.dashboardOverview.invalidate();
  };

  const create = trpc.catalog.createLabReport.useMutation({
    onSuccess: () => {
      setTitle("");
      setBatch("");
      setLab("");
      setTestedOn("");
      setFile(null);
      setExternalUrl("");
      refresh();
      toast.success("Lab report published");
    },
    onError: (e) => toast.error(e.message || "Could not save the report"),
  });

  const update = trpc.catalog.updateLabReport.useMutation({ onSuccess: refresh });
  const remove = trpc.catalog.deleteLabReport.useMutation({
    onSuccess: () => {
      refresh();
      toast.success("Report deleted");
    },
  });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (productId === "" || !title.trim()) return;

    const base = {
      productId: Number(productId),
      title: title.trim(),
      batch: batch.trim() || null,
      lab: lab.trim() || null,
      testedOn: testedOn || null,
    };

    if (mode === "link") {
      const url = externalUrl.trim();
      if (!url) return;
      create.mutate({
        ...base,
        fileUrl: url,
        fileKey: "",
        fileName: url.split("/").pop() || null,
      });
      return;
    }

    if (!file) return;
    try {
      const up = await upload(file, "lab-report");
      create.mutate({
        ...base,
        fileUrl: up.publicUrl,
        fileKey: up.storageKey,
        fileName: up.fileName,
        sizeBytes: up.sizeBytes,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    }
  };

  const noProducts = products.data?.length === 0;
  const busy = isUploading || create.isPending;

  return (
    <AdminLayout title="Lab Reports">
      {noProducts && (
        <div className="mb-5 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-900">
          Create a product first — every lab report belongs to one.
        </div>
      )}

      <Card title="Upload a report" description="PDF only. The file goes straight to R2 from your browser.">
        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Product">
              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value === "" ? "" : Number(e.target.value))}
                className={inputClass}
              >
                <option value="">Select a product…</option>
                {products.data?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Title" hint="What the customer sees in the list.">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Potency & Purity — Batch A1042"
                className={inputClass}
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Batch" hint="Match the number printed on the package.">
              <input
                value={batch}
                onChange={(e) => setBatch(e.target.value)}
                placeholder="A1042"
                className={inputClass}
              />
            </Field>
            <Field label="Lab">
              <input
                value={lab}
                onChange={(e) => setLab(e.target.value)}
                placeholder="Kaycha Labs"
                className={inputClass}
              />
            </Field>
            <Field label="Tested on">
              <input
                type="date"
                value={testedOn}
                onChange={(e) => setTestedOn(e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>

          <div className="flex gap-2">
            {(["upload", "link"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={
                  mode === m
                    ? "rounded-xl bg-neutral-950 px-4 py-2 text-sm font-semibold text-white"
                    : "rounded-xl border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-600 hover:bg-neutral-50"
                }
              >
                {m === "upload" ? "Upload a PDF" : "Link an existing PDF"}
              </button>
            ))}
          </div>

          {mode === "upload" ? (
            <Field label="PDF file">
              <input
                type="file"
                accept="application/pdf,.pdf"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-neutral-600 file:mr-3 file:rounded-lg file:border-0 file:bg-neutral-950 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-neutral-800"
              />
            </Field>
          ) : (
            <Field label="PDF URL" hint="The file stays where it is; only the link is saved.">
              <input
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                placeholder="https://…/COA.pdf"
                className={inputClass}
              />
            </Field>
          )}

          {isUploading && (
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200">
              <div
                className="h-full bg-neutral-900 transition-all"
                style={{ width: `${progress ?? 0}%` }}
              />
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={
                busy ||
                productId === "" ||
                !title.trim() ||
                (mode === "upload" ? !file : !externalUrl.trim())
              }
              className={buttonClass}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {isUploading ? `Uploading ${progress ?? 0}%` : "Publish report"}
            </button>
          </div>
        </form>
      </Card>

      <div className="mt-6 space-y-5">
        {products.data
          ?.filter((p) => p.reports.length > 0)
          .map((product) => (
            <div key={product.id} className="rounded-2xl border border-neutral-200 bg-white">
              <div className="border-b border-neutral-200 px-5 py-4">
                <h2 className="font-display text-lg font-semibold">{product.name}</h2>
                <p className="text-sm text-neutral-500">
                  {product.reports.length} report{product.reports.length === 1 ? "" : "s"}
                </p>
              </div>
              <ul className="divide-y divide-neutral-100">
                {product.reports.map((r) => (
                  <ReportRow key={r.id} report={r} onChanged={refresh} />
                ))}
              </ul>
            </div>
          ))}
      </div>
    </AdminLayout>
  );
}

type ReportRowProps = {
  report: {
    id: number;
    title: string;
    batch: string | null;
    lab: string | null;
    testedOn: string | null;
    fileUrl: string;
    fileKey: string;
    fileName: string | null;
    sizeBytes: number | null;
    sortOrder: number;
    published: boolean;
  };
  onChanged: () => void;
};

function ReportRow({ report, onChanged }: ReportRowProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(report.title);
  const [batch, setBatch] = useState(report.batch ?? "");
  const [lab, setLab] = useState(report.lab ?? "");
  const [testedOn, setTestedOn] = useState(report.testedOn ?? "");
  const [sortOrder, setSortOrder] = useState(report.sortOrder);

  // Replacing the PDF: either a fresh upload or a different URL.
  const [replaceMode, setReplaceMode] = useState<"none" | "upload" | "link">("none");
  const [newFile, setNewFile] = useState<File | null>(null);
  const [newUrl, setNewUrl] = useState("");

  const { upload, progress, isUploading } = useR2Upload();

  const update = trpc.catalog.updateLabReport.useMutation({
    onSuccess: () => {
      onChanged();
      setReplaceMode("none");
      setNewFile(null);
      setNewUrl("");
      toast.success("Report updated");
    },
    onError: (e) => toast.error(e.message || "Could not save"),
  });

  const remove = trpc.catalog.deleteLabReport.useMutation({
    onSuccess: () => {
      onChanged();
      toast.success("Report deleted");
    },
  });

  const save = async () => {
    const base = {
      id: report.id,
      title: title.trim(),
      batch: batch.trim() || null,
      lab: lab.trim() || null,
      testedOn: testedOn || null,
      sortOrder,
    };

    if (replaceMode === "link") {
      const url = newUrl.trim();
      if (!url) return toast.error("Paste the URL of the replacement PDF.");
      // fileKey is sent empty on purpose: the file is no longer ours to manage,
      // and the server uses the change of key to clean up the one it replaced.
      return update.mutate({
        ...base,
        fileUrl: url,
        fileKey: "",
        fileName: url.split("/").pop() || null,
        sizeBytes: null,
      });
    }

    if (replaceMode === "upload") {
      if (!newFile) return toast.error("Choose the replacement PDF.");
      try {
        const up = await upload(newFile, "lab-report");
        return update.mutate({
          ...base,
          fileUrl: up.publicUrl,
          fileKey: up.storageKey,
          fileName: up.fileName,
          sizeBytes: up.sizeBytes,
        });
      } catch (err) {
        return toast.error(err instanceof Error ? err.message : "Upload failed");
      }
    }

    update.mutate(base);
  };

  const busy = isUploading || update.isPending;
  const meta = [report.batch ? `Batch ${report.batch}` : null, report.testedOn, formatSize(report.sizeBytes)]
    .filter(Boolean)
    .join(" · ");

  return (
    <li>
      <div className="flex flex-wrap items-center gap-3 px-5 py-3.5 text-sm">
        <button
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900"
          title={open ? "Close" : "Edit"}
        >
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        <FileText className="h-4 w-4 shrink-0 text-neutral-400" />
        <a
          href={report.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="min-w-0 flex-1 truncate font-medium underline-offset-4 hover:underline"
        >
          {report.title}
        </a>
        <span className="shrink-0 text-xs text-neutral-400">{meta}</span>
        {!report.fileKey && (
          <span
            className="shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-bold uppercase text-neutral-500"
            title="Hosted elsewhere, not in your R2 bucket"
          >
            Linked
          </span>
        )}
        <button
          title={report.published ? "Hide from the public page" : "Publish"}
          onClick={() => update.mutate({ id: report.id, published: !report.published })}
          className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900"
        >
          {report.published ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </button>
        <button
          title="Delete report"
          onClick={() => {
            if (confirm(`Delete "${report.title}"? The PDF is removed from storage too.`)) {
              remove.mutate({ id: report.id });
            }
          }}
          className="rounded-lg p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-600"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {open && (
        <div className="border-t border-neutral-100 bg-neutral-50/60 px-5 py-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Title">
              <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Batch">
              <input value={batch} onChange={(e) => setBatch(e.target.value)} className={inputClass} />
            </Field>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Field label="Lab">
              <input value={lab} onChange={(e) => setLab(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Tested on">
              <input
                type="date"
                value={testedOn}
                onChange={(e) => setTestedOn(e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Sort order">
              <input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value) || 0)}
                className={inputClass}
              />
            </Field>
          </div>

          <div className="mt-5 rounded-xl border border-neutral-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Current file
            </p>
            <a
              href={report.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 block break-all text-sm text-neutral-600 underline-offset-4 hover:underline"
            >
              {report.fileName || report.fileUrl}
            </a>

            <div className="mt-3 flex flex-wrap gap-2">
              {(["none", "upload", "link"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setReplaceMode(m)}
                  className={
                    replaceMode === m
                      ? "rounded-xl bg-neutral-950 px-3.5 py-2 text-sm font-semibold text-white"
                      : "rounded-xl border border-neutral-300 px-3.5 py-2 text-sm font-semibold text-neutral-600 hover:bg-neutral-50"
                  }
                >
                  {m === "none" ? "Keep it" : m === "upload" ? "Upload a new PDF" : "Point at a URL"}
                </button>
              ))}
            </div>

            {replaceMode === "upload" && (
              <input
                type="file"
                accept="application/pdf,.pdf"
                onChange={(e) => setNewFile(e.target.files?.[0] ?? null)}
                className="mt-3 block w-full text-sm text-neutral-600 file:mr-3 file:rounded-lg file:border-0 file:bg-neutral-950 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-neutral-800"
              />
            )}
            {replaceMode === "link" && (
              <input
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="https://…/new-COA.pdf"
                className={`${inputClass} mt-3`}
              />
            )}
            {replaceMode !== "none" && (
              <p className="mt-2 text-xs text-amber-700">
                The public link changes as soon as you save.
                {report.fileKey
                  ? " The PDF it replaces is deleted from your bucket."
                  : ""}
              </p>
            )}
            {isUploading && (
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-neutral-200">
                <div
                  className="h-full bg-neutral-900 transition-all"
                  style={{ width: `${progress ?? 0}%` }}
                />
              </div>
            )}
          </div>

          <button onClick={save} disabled={busy || !title.trim()} className={`${buttonClass} mt-4`}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isUploading ? `Uploading ${progress ?? 0}%` : "Save changes"}
          </button>
        </div>
      )}
    </li>
  );
}
