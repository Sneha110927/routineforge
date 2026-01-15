"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import AuthCard from "@/components/auth/AuthCard";
import TextField from "@/components/auth/TextField";
import { isValidEmail } from "@/lib/validators";

function MailIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="stroke-current">
      <path d="M4 6h16v12H4V6Z" strokeWidth="2" strokeLinejoin="round" />
      <path d="m4 7 8 6 8-6" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

type Resp = { ok: true; resetLink?: string } | { ok: false; message: string };

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const [info, setInfo] = useState<string | null>(null);
  const [devLink, setDevLink] = useState<string | null>(null);

  const error = useMemo(() => {
    if (!email) return null;
    return isValidEmail(email) ? null : "Enter a valid email address.";
  }, [email]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setInfo(null);
    setDevLink(null);

    if (!isValidEmail(email)) return;

    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = (await res.json()) as Resp;

      // Always show same message
      setInfo("If your email exists, we sent a reset link. Please check.");
      if ("resetLink" in data && data.resetLink) {
        setDevLink(data.resetLink); // dev-only
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white px-6 py-14">
      <div className="mx-auto flex max-w-6xl items-center justify-center">
        <div className="w-full max-w-md">
          <AuthCard
            title="Forgot password"
            subtitle="We’ll help you reset it"
            footer={
              <div className="text-center text-sm text-zinc-600">
                Back to{" "}
                <Link href="/login" className="font-semibold text-emerald-600 hover:text-emerald-700">
                  Log in
                </Link>
              </div>
            }
          >
            <form onSubmit={onSubmit} className="space-y-6">
              <TextField
                label="Email"
                value={email}
                onChange={setEmail}
                placeholder="you@example.com"
                type="email"
                icon={<MailIcon />}
                error={error}
                autoComplete="email"
              />

              <button
                type="submit"
                disabled={!isValidEmail(email) || loading}
                className={[
                  "mt-2 w-full rounded-xl px-5 py-3 text-sm font-semibold text-white",
                  "bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700",
                  "disabled:cursor-not-allowed disabled:bg-emerald-300",
                ].join(" ")}
              >
                {loading ? "Sending..." : "Send reset link"}
              </button>

              {info ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  {info}
                </div>
              ) : null}

              {devLink ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  Dev link:{" "}
                  <Link className="font-semibold underline underline-offset-2" href={devLink}>
                    Reset password
                  </Link>
                </div>
              ) : null}
            </form>
          </AuthCard>
        </div>
      </div>
    </div>
  );
}
