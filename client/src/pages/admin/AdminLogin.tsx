import { trpc } from "@/lib/trpc";
import { Loader2, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

export default function AdminLogin() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const setupStatus = trpc.adminAuth.setupStatus.useQuery();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [setupToken, setSetupToken] = useState("");

  const goToDashboard = async () => {
    await utils.adminAuth.me.invalidate();
    navigate("/admin");
  };

  const login = trpc.adminAuth.login.useMutation({ onSuccess: goToDashboard });
  const setup = trpc.adminAuth.setup.useMutation({ onSuccess: goToDashboard });

  const needsSetup = setupStatus.data?.needsSetup;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (needsSetup) {
      setup.mutate({
        email: email.trim(),
        password,
        name: name.trim() || undefined,
        setupToken: setupToken.trim(),
      });
    } else {
      login.mutate({ email: email.trim(), password });
    }
  };

  const pending = login.isPending || setup.isPending;
  const error = login.isError || setup.isError;

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 p-5 text-white">
      <div className="w-full max-w-sm">
        <div className="rounded-[1.75rem] border border-white/10 bg-neutral-900 p-8 shadow-2xl">
          <div className="inline-flex rounded-xl bg-white p-2.5 text-neutral-950">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold">
            {needsSetup ? "Create Admin Account" : "Beri Admin"}
          </h1>
          <p className="mt-1 text-sm text-neutral-400">
            {needsSetup
              ? "No admin exists yet. Enter the setup token to create the first administrator."
              : "Sign in to manage Beri Disposable."}
          </p>

          {setupStatus.isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-neutral-500" />
            </div>
          ) : (
            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              {needsSetup && (
                <div>
                  <label className="text-sm font-medium text-neutral-300">Setup token</label>
                  <input
                    required
                    type="password"
                    value={setupToken}
                    onChange={(e) => setSetupToken(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-white/10 bg-neutral-800 px-4 py-3 text-white outline-none transition focus:border-white/30"
                    placeholder="ADMIN_SETUP_TOKEN"
                  />
                </div>
              )}
              {needsSetup && (
                <div>
                  <label className="text-sm font-medium text-neutral-300">Name</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-white/10 bg-neutral-800 px-4 py-3 text-white outline-none transition focus:border-white/30"
                    placeholder="Your name"
                  />
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-neutral-300">Email</label>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-neutral-800 px-4 py-3 text-white outline-none transition focus:border-white/30"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-neutral-300">Password</label>
                <input
                  required
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-neutral-800 px-4 py-3 text-white outline-none transition focus:border-white/30"
                  placeholder={needsSetup ? "At least 8 characters" : ""}
                />
              </div>
              {error && (
                <p className="text-sm text-red-400">
                  {needsSetup
                    ? "Could not create admin. Check the setup token."
                    : "Invalid credentials."}
                </p>
              )}
              <button
                type="submit"
                disabled={pending}
                className="press inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-neutral-950 transition-colors hover:bg-neutral-200 disabled:opacity-50"
              >
                {pending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : needsSetup ? (
                  "Create Account"
                ) : (
                  "Sign In"
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
