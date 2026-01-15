"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import AuthCard from "@/components/auth/AuthCard";
import TextField from "@/components/auth/TextField";
import { minLen } from "@/lib/validators";

function LockIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      className="stroke-current"
    >
      <path
        d="M7 11V8a5 5 0 0 1 10 0v3"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M6 11h12v10H6V11Z" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

type Resp = { ok: true } | { ok: false; message: string };

function getMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "Reset failed";
}

export default function ResetPasswordClient() {
  const sp = useSearchParams();
  const router = useRouter();

  const token = sp.get("token") ?? "";

  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const errors = useMemo(() => {
    const e: Record<string, string | null> = { pwd: null, confirm: null };

    if (pwd && !minLen(pwd, 6))
      e.pwd = "Password must be at least 6 characters.";
    if (confirm && confirm !== pwd) e.confirm = "Passwords do not match.";

    return e;
  }, [pwd, confirm]);

  const canSubmit =
    token.length > 0 && minLen(pwd, 6) && confirm === pwd && !loading;

async function onSubmit(e: React.FormEvent) {
  e.preventDefault();
  setMsg(null);
  if (!canSubmit) return;

  setLoading(true);
  try {
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password: pwd }),
    });

    const text = await res.text();

    let data: Resp;
    try {
      data = text ? (JSON.parse(text) as Resp) : { ok: false, message: "Empty response from server" };
    } catch {
      data = { ok: false, message: "Invalid server response" };
    }

    if (!res.ok || !data.ok) {
      const msgText = "message" in data ? data.message : "Reset failed";
      throw new Error(msgText);
    }

    setMsg("✅ Password updated. Redirecting to login…");
    setTimeout(() => router.replace("/login"), 800);
  } catch (e: unknown) {
    setMsg(getMessage(e));
  } finally {
    setLoading(false);
  }
}


  return (
    <div className="min-h-screen bg-white px-6 py-14">
      <div className="mx-auto flex max-w-6xl items-center justify-center">
        <div className="w-full max-w-md">
          <AuthCard
            title="Reset password"
            subtitle="Set a new password for your account"
            footer={
              <div className="text-center text-sm text-zinc-600">
                Back to{" "}
                <Link
                  href="/login"
                  className="font-semibold text-emerald-600 hover:text-emerald-700"
                >
                  Log in
                </Link>
              </div>
            }
          >
            {!token ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                Reset link is missing or invalid.
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-6">
                <TextField
                  label="New Password"
                  value={pwd}
                  onChange={setPwd}
                  placeholder="••••••••"
                  type={showPwd ? "text" : "password"}
                  icon={<LockIcon />}
                  error={errors.pwd}
                  autoComplete="new-password"
                  right={
                    <button
                      type="button"
                      onClick={() => setShowPwd((s) => !s)}
                      className="text-xs font-semibold text-zinc-600 hover:text-zinc-900"
                    >
                      {showPwd ? "Hide" : "Show"}
                    </button>
                  }
                />

                <TextField
                  label="Confirm Password"
                  value={confirm}
                  onChange={setConfirm}
                  placeholder="••••••••"
                  type={showConfirm ? "text" : "password"}
                  icon={<LockIcon />}
                  error={errors.confirm}
                  autoComplete="new-password"
                  right={
                    <button
                      type="button"
                      onClick={() => setShowConfirm((s) => !s)}
                      className="text-xs font-semibold text-zinc-600 hover:text-zinc-900"
                    >
                      {showConfirm ? "Hide" : "Show"}
                    </button>
                  }
                />

                <button
                  type="submit"
                  disabled={!canSubmit}
                  className={[
                    "mt-2 w-full rounded-xl px-5 py-3 text-sm font-semibold text-white",
                    "bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700",
                    "disabled:cursor-not-allowed disabled:bg-emerald-300",
                  ].join(" ")}
                >
                  {loading ? "Updating..." : "Update password"}
                </button>

                {msg ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    {msg}
                  </div>
                ) : null}
              </form>
            )}
          </AuthCard>
        </div>
      </div>
    </div>
  );
}
