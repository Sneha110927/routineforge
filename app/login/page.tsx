"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AuthCard from "@/components/auth/AuthCard";
import TextField from "@/components/auth/TextField";
import { isValidEmail, minLen } from "@/lib/validators";

function MailIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      className="stroke-current"
    >
      <path d="M4 6h16v12H4V6Z" strokeWidth="2" strokeLinejoin="round" />
      <path d="m4 7 8 6 8-6" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

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

type LoginSuccess = { ok: true; user: { email: string; fullName: string } };
type LoginFail = { ok: false; message: string };
type LoginResponse = LoginSuccess | LoginFail;

function getMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "Something went wrong.";
}

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);

  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const errors = useMemo(() => {
    const e: Record<string, string | null> = { email: null, pwd: null };
    if (email && !isValidEmail(email)) e.email = "Enter a valid email address.";
    if (pwd && !minLen(pwd, 6))
      e.pwd = "Password must be at least 6 characters.";
    return e;
  }, [email, pwd]);

  const canSubmit = isValidEmail(email) && minLen(pwd, 6) && !loading;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);
    if (!canSubmit) return;

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: pwd }),
      });
const text = await res.text();
const data = text ? (JSON.parse(text) as LoginResponse) : ({ ok: false, message: "Empty response from server" } as LoginResponse);


      if (!res.ok || !data.ok) {
        const msg =
          "message" in data ? data.message : "Invalid email or password.";
        throw new Error(msg);
      }

      localStorage.setItem("rf_email", data.user.email);
      router.replace("/onboarding");
    } catch (err: unknown) {
      setServerError(getMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white px-6 py-14">
      <div className="mx-auto flex max-w-6xl items-center justify-center">
        {/* Make the auth card compact like your 2nd screenshot */}
        <div className="w-full max-w-md">
          <AuthCard
            title="Welcome back"
            subtitle="Log in to continue your journey"
            footer={
              <>
                <div className="text-center text-sm text-zinc-600">
                  Don&apos;t have an account?{" "}
                  <Link
                    href="/get-started"
                    className="font-semibold text-emerald-600 hover:text-emerald-700"
                  >
                    Sign up
                  </Link>
                </div>

                <div className="my-10 border-t border-zinc-200" />

                <div className="text-center text-sm text-zinc-600">
                  <Link href="/forgot-password" className="hover:text-zinc-900">
                    Forgot password?
                  </Link>
                </div>
              </>
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
                error={errors.email}
                autoComplete="email"
              />

              <TextField
                label="Password"
                value={pwd}
                onChange={setPwd}
                placeholder="••••••••"
                type={showPwd ? "text" : "password"}
                icon={<LockIcon />}
                error={errors.pwd}
                autoComplete="current-password"
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

              {serverError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {serverError}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={!canSubmit}
                className={[
                  "mt-2 w-full rounded-xl px-5 py-3 text-sm font-semibold text-white",
                  "bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700",
                  "disabled:cursor-not-allowed disabled:bg-emerald-300",
                ].join(" ")}
              >
                {loading ? "Logging in..." : "Log In"}
              </button>
            </form>
          </AuthCard>
        </div>
      </div>
    </div>
  );
}
