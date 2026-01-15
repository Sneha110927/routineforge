import { Suspense } from "react";
import ResetPasswordClient from "./ResetPasswordClient";

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white px-6 py-14">
          <div className="mx-auto flex max-w-6xl items-center justify-center">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="text-center">
                <h1 className="text-xl font-semibold text-slate-900">Reset password</h1>
                <p className="mt-2 text-sm text-slate-600">Loading…</p>
              </div>
            </div>
          </div>
        </div>
      }
    >
      <ResetPasswordClient />
    </Suspense>
  );
}
