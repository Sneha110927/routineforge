import Image from 'next/image';
import Link from 'next/link';

export default function Hero() {
  return (
    <section className="relative">
      {/* soft background glow */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-28 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-6 pb-20 pt-10 md:grid-cols-2 md:gap-14 md:pt-16">
        {/* Left content */}
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-700">
            <span className="inline-grid h-5 w-5 place-items-center rounded-full bg-emerald-500/20">
              ⚡
            </span>
            Your personal life planner
          </div>

          <h1 className="mt-6 text-[44px] font-semibold leading-[1.05] tracking-tight md:text-[56px]">
            Plan your day.
            <br />
            Eat better.
            <br />
            Train smarter.
          </h1>

          <p className="mt-6 max-w-xl text-base leading-7 text-zinc-600 md:text-lg">
            Build a personalized routine, get smart meal and workout plans, and track your
            progress—all in one clean, simple app designed for busy professionals.
          </p>

          {/* CTA buttons */}
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              href="/get-started"
              className="rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-600 active:bg-emerald-700"
            >
              Create My Plan
            </Link>

            <Link
              href="/login"
              className="rounded-xl border border-zinc-200 bg-white px-6 py-3 text-sm font-semibold text-zinc-900 shadow-sm hover:bg-zinc-50 active:bg-zinc-100"
            >
              Log In
            </Link>
          </div>

          {/* Bullet line */}
          <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-2 text-sm text-zinc-600">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              No credit card required
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Takes 2 minutes
            </div>
          </div>
        </div>

        {/* Right image card */}
        <div className="relative">
          <div className="absolute -inset-8 -z-10 rounded-[32px] bg-white/60 blur-2xl" />

          <div className="overflow-hidden rounded-[32px] shadow-[0_30px_80px_rgba(0,0,0,0.15)] ring-1 ring-black/5">
            <Image
              src="/Hero.jpg"
              alt="RoutineForge preview"
              width={900}
              height={700}
              className="h-[340px] w-full object-cover md:h-[520px]"
              priority
            />
          </div>
        </div>
      </div>
    </section>
  );
}
