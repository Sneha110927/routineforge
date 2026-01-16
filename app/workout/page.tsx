import { Suspense } from "react";
import WorkoutClient from "./WorkoutClient";

export default function WorkoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white px-6 py-14">
          <div className="mx-auto max-w-6xl">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-slate-700">
              Loading workout…
            </div>
          </div>
        </div>
      }
    >
      <WorkoutClient />
    </Suspense>
  );
}
