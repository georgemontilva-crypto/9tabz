import { AdminLayout, Card, Field, buttonClass, inputClass } from "@/components/AdminLayout";
import { Pagination, TableCard } from "@/components/admin/AdminTable";
import { trpc } from "@/lib/trpc";
import { DEFAULT_MAX_VERIFICATIONS } from "@shared/const";
import { Ban, Check, Loader2, Plus, RotateCcw, Search, Tag, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

export default function AdminCodes() {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  // Shared by both the single-add form and the bulk import, since in practice a
  // batch of codes arrives from the client as one file for one product.
  const [productId, setProductId] = useState<number | "">("");
  const [batch, setBatch] = useState("");
  const [maxVerifications, setMaxVerifications] = useState(DEFAULT_MAX_VERIFICATIONS);
  const [newCode, setNewCode] = useState("");
  const [pasted, setPasted] = useState("");

  const fileRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();

  const products = trpc.catalog.adminProducts.useQuery(undefined, { retry: false });
  const list = trpc.codes.adminList.useQuery(
    { search: query || undefined, page, pageSize: 50 },
    { retry: false }
  );

  const common = () => ({
    productId: productId === "" ? null : Number(productId),
    batch: batch.trim() || null,
    maxVerifications,
  });

  const refresh = () => {
    utils.codes.adminList.invalidate();
    utils.adminAuth.dashboardOverview.invalidate();
  };

  const add = trpc.codes.adminAdd.useMutation({
    onSuccess: () => {
      setNewCode("");
      refresh();
      toast.success("Code added");
    },
    onError: (e) => toast.error(e.message || "Could not add code"),
  });

  const bulk = trpc.codes.adminBulkImport.useMutation();

  /**
   * Codes per request.
   *
   * A real batch file runs to hundreds of thousands of codes. Sent whole, the
   * request carries several megabytes and the server runs hundreds of queries
   * inside it, which outlives the proxy's response timeout — the import dies
   * with no way to tell how much of it landed. Chunked, each request is small
   * and quick, and the progress figure is real rather than a spinner.
   */
  const CHUNK = 5000;

  const [importProgress, setImportProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);

  const importCodes = async (content: string) => {
    // Split here as well as on the server, so the chunk boundaries fall between
    // codes. Slicing the raw text would cut one in half across two requests.
    const codes = content
      .split(/[\r\n,;\t]+/)
      .map((t) => t.trim().replace(/^["']|["']$/g, ""))
      .filter((t) => t.length > 0 && !/^(id|code|codes|created|updated|product|batch)$/i.test(t));

    if (codes.length === 0) {
      toast.error("No codes found in that file");
      return;
    }

    let processed = 0;
    let skipped = 0;
    setImportProgress({ done: 0, total: codes.length });

    try {
      for (let i = 0; i < codes.length; i += CHUNK) {
        const slice = codes.slice(i, i + CHUNK);
        const r = await bulk.mutateAsync({ content: slice.join("\n"), ...common() });
        processed += r.processed;
        skipped += r.skipped;
        setImportProgress({ done: Math.min(i + CHUNK, codes.length), total: codes.length });
      }

      setPasted("");
      if (fileRef.current) fileRef.current.value = "";
      toast.success(
        skipped > 0
          ? `Imported ${processed} codes (${skipped} already existed and were left untouched)`
          : `Imported ${processed} codes`
      );
    } catch (e: any) {
      // Whatever already went through stays in. The import skips codes that
      // exist, so re-running the same file picks up only what is missing.
      toast.error(
        `${e?.message || "Import failed"} — ${processed} code(s) were imported before it stopped. Re-running the same file will add the rest.`
      );
    } finally {
      setImportProgress(null);
      refresh();
    }
  };

  const del = trpc.codes.adminDelete.useMutation({
    onSuccess: () => {
      refresh();
      toast.success("Code deleted");
    },
  });

  const reset = trpc.codes.adminResetCount.useMutation({
    onSuccess: () => {
      refresh();
      toast.success("Verification count reset");
    },
  });

  const update = trpc.codes.adminUpdate.useMutation({ onSuccess: refresh });

  // Reassigning codes already loaded
  type ScopeKind = "unassigned" | "batch" | "search" | "all";
  const [scopeKind, setScopeKind] = useState<ScopeKind>("unassigned");
  const [scopeValue, setScopeValue] = useState("");
  const [assignProductId, setAssignProductId] = useState<number | "">("");
  const [assignBatch, setAssignBatch] = useState("");

  const scope =
    scopeKind === "batch"
      ? { kind: "batch" as const, batch: scopeValue.trim() }
      : scopeKind === "search"
        ? { kind: "search" as const, search: scopeValue.trim() }
        : { kind: scopeKind as "all" | "unassigned" };

  const scopeReady = scopeKind === "all" || scopeKind === "unassigned" || !!scopeValue.trim();

  const utilsCount = trpc.useUtils();
  const assign = trpc.codes.adminBulkAssign.useMutation({
    onSuccess: (r) => {
      refresh();
      toast.success(`${r.updated} code(s) updated`);
    },
    onError: (e) => toast.error(e.message || "Could not reassign"),
  });

  /**
   * The count is fetched before anything is written. "Assign to all" over this
   * table is one click away from rewriting every code in circulation, and a
   * number in the confirmation is the difference between noticing that and not.
   */
  const runAssign = async () => {
    if (!scopeReady) return;
    if (assignProductId === "" && !assignBatch.trim()) {
      toast.error("Pick a product or a batch to set.");
      return;
    }
    const { count } = await utilsCount.codes.adminCountScope.fetch(scope);
    if (count === 0) {
      toast.error("No codes match that scope.");
      return;
    }
    const target = products.data?.find((p) => p.id === assignProductId)?.name;
    const changes = [
      target ? `product to "${target}"` : null,
      assignBatch.trim() ? `batch to ${assignBatch.trim()}` : null,
    ]
      .filter(Boolean)
      .join(" and ");

    if (confirm(`Set ${changes} on ${count} code(s)? This cannot be undone.`)) {
      assign.mutate({
        scope,
        ...(assignProductId === "" ? {} : { productId: Number(assignProductId) }),
        ...(assignBatch.trim() ? { batch: assignBatch.trim() } : {}),
      });
    }
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await importCodes(await file.text());
  };

  return (
    <AdminLayout title="Verification Codes">
      {/* Settings applied to whatever is added below */}
      <Card
        title="Apply to new codes"
        description="These are attached to every code you add or import below. They don't affect codes already in the list."
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Product">
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value === "" ? "" : Number(e.target.value))}
              className={inputClass}
            >
              <option value="">No product</option>
              {products.data?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Batch" hint="Optional, shown on the verification result.">
            <input
              value={batch}
              onChange={(e) => setBatch(e.target.value)}
              placeholder="e.g. A1042"
              className={inputClass}
            />
          </Field>
          <Field label="Max checks" hint="How many times each code can be verified.">
            <input
              type="number"
              min={1}
              max={100}
              value={maxVerifications}
              onChange={(e) => setMaxVerifications(Math.max(1, Number(e.target.value) || 1))}
              className={inputClass}
            />
          </Field>
        </div>
      </Card>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card
          title="Import codes"
          description="Upload a CSV or TXT file, or paste a list. One code per line or comma-separated. Large files are sent in blocks of 5,000; codes that already exist are skipped, never reset."
        >
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.txt,text/plain,text/csv"
            onChange={onFile}
            disabled={!!importProgress}
            className="block w-full text-sm text-neutral-600 file:mr-3 file:rounded-lg file:border-0 file:bg-neutral-950 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-neutral-800"
          />
          <textarea
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            rows={4}
            placeholder={"ABCD12345\nABCD12346\nABCD12347"}
            className={`${inputClass} mt-3 font-mono`}
          />
          {importProgress && (
            <div className="mt-3">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200">
                <div
                  className="h-full bg-neutral-900 transition-all"
                  style={{
                    width: `${Math.round((importProgress.done / importProgress.total) * 100)}%`,
                  }}
                />
              </div>
              <p className="mt-1.5 text-xs tabular-nums text-neutral-500">
                {importProgress.done.toLocaleString()} of{" "}
                {importProgress.total.toLocaleString()} codes — keep this tab open
              </p>
            </div>
          )}

          <button
            onClick={() => pasted.trim() && importCodes(pasted)}
            disabled={!!importProgress || !pasted.trim()}
            className={`${buttonClass} mt-3`}
          >
            {importProgress ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Import pasted list
          </button>
        </Card>

        <Card title="Add a single code" description="Useful for a replacement label or a one-off.">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (newCode.trim()) add.mutate({ code: newCode.trim(), ...common() });
            }}
            className="flex gap-2"
          >
            <input
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              placeholder="ABCD12345"
              className={`${inputClass} font-mono`}
            />
            <button type="submit" disabled={add.isPending || !newCode.trim()} className={buttonClass}>
              <Plus className="h-4 w-4" />
              Add
            </button>
          </form>
        </Card>
      </div>

      <div className="mt-5">
        <Card
          title="Reassign codes already loaded"
          description="The codes printed on the packaging don't encode a flavour, so in practice they all belong to the same catalogue entry. Use this to point a batch — or everything — at one product."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Which codes">
              <select
                value={scopeKind}
                onChange={(e) => {
                  setScopeKind(e.target.value as ScopeKind);
                  setScopeValue("");
                }}
                className={inputClass}
              >
                <option value="unassigned">Only codes with no product yet</option>
                <option value="batch">Codes in a specific batch</option>
                <option value="search">Codes matching a search</option>
                <option value="all">Every code in the database</option>
              </select>
            </Field>

            {(scopeKind === "batch" || scopeKind === "search") && (
              <Field label={scopeKind === "batch" ? "Batch" : "Search text"}>
                <input
                  value={scopeValue}
                  onChange={(e) => setScopeValue(e.target.value)}
                  placeholder={scopeKind === "batch" ? "A1042" : "Part of a code or batch"}
                  className={inputClass}
                />
              </Field>
            )}
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Set product to" hint="Leave empty to leave the product untouched.">
              <select
                value={assignProductId}
                onChange={(e) =>
                  setAssignProductId(e.target.value === "" ? "" : Number(e.target.value))
                }
                className={inputClass}
              >
                <option value="">Don&apos;t change</option>
                {products.data?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Set batch to" hint="Leave empty to leave the batch untouched.">
              <input
                value={assignBatch}
                onChange={(e) => setAssignBatch(e.target.value)}
                placeholder="A1042"
                className={inputClass}
              />
            </Field>
          </div>

          {scopeKind === "all" && (
            <p className="mt-4 text-sm text-amber-700">
              This touches every code in the database, including ones you assigned
              deliberately.
            </p>
          )}

          <button
            onClick={runAssign}
            disabled={assign.isPending || !scopeReady}
            className={`${buttonClass} mt-4`}
          >
            {assign.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Tag className="h-4 w-4" />
            )}
            Assign
          </button>
          <p className="mt-2 text-xs text-neutral-400">
            You&apos;ll see how many codes match and have to confirm before anything is
            written.
          </p>
        </Card>
      </div>

      {/* List */}
      <div className="mt-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            setQuery(search.trim());
          }}
          className="mb-4 flex gap-2"
        >
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search code or batch…"
              className={`${inputClass} pl-9`}
            />
          </div>
          <button className={buttonClass}>Search</button>
        </form>

        <TableCard>
          {/* The table scrolls inside its own box instead of letting the page
              grow. At 50 rows a page, page-level scrolling pushes the search
              field and the paginator off screen exactly when they're needed.
              The header stays stuck so it's still clear which column is which. */}
          <div className="max-h-[60vh] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 border-b border-neutral-200 bg-neutral-50 text-left text-xs uppercase tracking-wider text-neutral-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Code</th>
                  <th className="px-5 py-3 font-semibold">Product</th>
                  <th className="px-5 py-3 font-semibold">Batch</th>
                  <th className="px-5 py-3 font-semibold">Checks</th>
                  <th className="px-5 py-3 font-semibold">Last checked</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {list.isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-neutral-400">
                      <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                    </td>
                  </tr>
                ) : list.data && list.data.rows.length > 0 ? (
                  list.data.rows.map((c) => {
                    const spent = c.verificationCount >= c.maxVerifications;
                    return (
                      <tr key={c.id} className={c.disabled ? "bg-neutral-50/70" : "hover:bg-neutral-50"}>
                        <td className="px-5 py-3">
                          <span className="rounded-md bg-neutral-100 px-2 py-1 font-mono text-xs font-semibold">
                            {c.code}
                          </span>
                          {c.disabled && (
                            <span className="ml-2 rounded-full bg-neutral-900 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                              Disabled
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-neutral-600">{c.productName ?? "—"}</td>
                        <td className="px-5 py-3 text-neutral-500">{c.batch ?? "—"}</td>
                        <td className="px-5 py-3">
                          <span
                            className={
                              spent
                                ? "rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-red-700"
                                : c.verificationCount > 0
                                  ? "rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-amber-800"
                                  : "rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-neutral-600"
                            }
                          >
                            {c.verificationCount} / {c.maxVerifications}
                          </span>
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap text-neutral-500">
                          {c.lastVerifiedAt ? new Date(c.lastVerifiedAt).toLocaleString() : "—"}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              title={c.disabled ? "Re-enable code" : "Disable code"}
                              onClick={() => update.mutate({ id: c.id, disabled: !c.disabled })}
                              className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900"
                            >
                              {c.disabled ? <Check className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                            </button>
                            <button
                              title="Reset verification count"
                              onClick={() => reset.mutate({ id: c.id })}
                              className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </button>
                            <button
                              title="Delete code"
                              onClick={() => {
                                if (confirm(`Delete code ${c.code}? This cannot be undone.`)) {
                                  del.mutate({ id: c.id });
                                }
                              }}
                              className="rounded-lg p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-neutral-400">
                      No codes found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {list.data && (
            <Pagination page={page} pageSize={50} total={list.data.total} onChange={setPage} />
          )}
        </TableCard>
      </div>
    </AdminLayout>
  );
}
