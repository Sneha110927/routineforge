"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AuthCard from "@/components/auth/AuthCard";
import TextField from "@/components/auth/TextField";
import { isValidEmail, minLen } from "@/lib/validators";

function UserIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="stroke-current">
      <path d="M20 21a8 8 0 0 0-16 0" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M12 11a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="stroke-current">
      <path d="M4 6h16v12H4V6Z" strokeWidth="2" strokeLinejoin="round" />
      <path d="m4 7 8 6 8-6" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="stroke-current">
      <path d="M7 11V8a5 5 0 0 1 10 0v3" strokeWidth="2" strokeLinecap="round" />
      <path d="M6 11h12v10H6V11Z" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

type SignupSuccess = { ok: true; user: { email: string; fullName: string } };
type SignupFail = { ok: false; message: string };
type SignupResponse = SignupSuccess | SignupFail;

function getMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "Something went wrong. Please try again.";
}

export default function SignUpPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const errors = useMemo(() => {
    const e: Record<string, string | null> = {
      fullName: null,
      email: null,
      pwd: null,
      confirm: null,
    };

    if (fullName && !minLen(fullName, 2)) e.fullName = "Please enter your full name.";
    if (email && !isValidEmail(email)) e.email = "Enter a valid email address.";
    if (pwd && !minLen(pwd, 6)) e.pwd = "Password must be at least 6 characters.";
    if (confirm && confirm !== pwd) e.confirm = "Passwords do not match.";

    return e;
  }, [fullName, email, pwd, confirm]);

  const canSubmit =
    minLen(fullName, 2) &&
    isValidEmail(email) &&
    minLen(pwd, 6) &&
    confirm === pwd &&
    !loading;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);
    if (!canSubmit) return;

    setLoading(true);
    try {
      const emailNorm = email.trim().toLowerCase();

      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email: emailNorm, password: pwd }),
      });

      const text = await res.text();
      let data: SignupResponse;

      try {
        data = text
          ? (JSON.parse(text) as SignupResponse)
          : ({ ok: false, message: "Empty response from server" } as SignupResponse);
      } catch {
        data = { ok: false, message: "Invalid response from server" };
      }

      if (!res.ok || !data.ok) {
        const msg = "message" in data ? data.message : "Signup failed.";
        throw new Error(msg);
      }

      localStorage.setItem("rf_email", data.user.email);

      // ✅ New user always goes to onboarding
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
        <div className="w-full max-w-md">
          <AuthCard
            title="Create your account"
            subtitle="Start building your personalized routine"
            footer={
              <>
                <div className="text-center text-sm text-zinc-600">
                  Already have an account?{" "}
                  <Link href="/login" className="font-semibold text-emerald-600 hover:text-emerald-700">
                    Log in
                  </Link>
                </div>

                <div className="my-10 border-t border-zinc-200" />

                <p className="text-center text-xs leading-5 text-zinc-500">
                  By creating an account, you agree to our{" "}
                  <Link href="#" className="underline underline-offset-2 hover:text-zinc-700">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link href="#" className="underline underline-offset-2 hover:text-zinc-700">
                    Privacy Policy
                  </Link>
                </p>
              </>
            }
          >
            <form onSubmit={onSubmit} className="space-y-6">
              <TextField
                label="Full Name"
                value={fullName}
                onChange={setFullName}
                placeholder="John Doe"
                icon={<UserIcon />}
                error={errors.fullName}
                autoComplete="name"
              />

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
                {loading ? "Creating..." : "Create Account"}
              </button>
            </form>
          </AuthCard>
        </div>
      </div>
    </div>
  );
}
