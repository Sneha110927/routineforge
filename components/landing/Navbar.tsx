import Link from 'next/link';

export default function Navbar() {
  return (
    <header className="w-full">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-emerald-500/10">
            <span className="grid h-6 w-6 place-items-center rounded-full border-2 border-emerald-500">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
          </span>

          <span className="text-xl font-semibold tracking-tight">RoutineForge</span>
        </Link>

        {/* Right actions */}
        <nav className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-sm font-medium text-zinc-700 hover:text-zinc-900"
          >
            Log In
          </Link>

          <Link
            href="/get-started"
            className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-600 active:bg-emerald-700"
          >
            Get Started
          </Link>
        </nav>
      </div>
    </header>
  );
}
