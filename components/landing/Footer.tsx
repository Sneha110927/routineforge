import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-white">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-4">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-emerald-500/10">
                <span className="grid h-5 w-5 place-items-center rounded-full border-2 border-emerald-500">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                </span>
              </span>
              <span className="text-lg font-semibold">RoutineForge</span>
            </div>

            <p className="mt-4 text-sm text-zinc-600">
              Simple, effective health and lifestyle planning for busy professionals.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-sm font-semibold text-zinc-900">Product</h4>
            <ul className="mt-4 space-y-2 text-sm text-zinc-600">
              <li><Link href="#">Features</Link></li>
              <li><Link href="#">How it works</Link></li>
              <li><Link href="#">Pricing</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-sm font-semibold text-zinc-900">Company</h4>
            <ul className="mt-4 space-y-2 text-sm text-zinc-600">
              <li><Link href="#">About</Link></li>
              <li><Link href="#">Blog</Link></li>
              <li><Link href="#">Careers</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-sm font-semibold text-zinc-900">Legal</h4>
            <ul className="mt-4 space-y-2 text-sm text-zinc-600">
              <li><Link href="#">Privacy</Link></li>
              <li><Link href="#">Terms</Link></li>
              <li><Link href="#">Contact</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-16 border-t border-zinc-200 pt-6 text-center text-sm text-zinc-500">
          © 2026 RoutineForge. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
