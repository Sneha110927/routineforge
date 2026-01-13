import Link from 'next/link';

export default function CTA() {
  return (
    <section className="bg-emerald-500 py-24">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <h2 className="text-3xl font-semibold tracking-tight text-white md:text-5xl">
          Ready to build your best routine?
        </h2>

        <p className="mt-4 text-base text-emerald-50 md:text-lg">
          Join thousands of professionals who&apos;ve simplified their health journey.
        </p>

        <div className="mt-10">
          <Link
            href="/get-started"
            className="inline-flex items-center justify-center rounded-xl bg-white px-8 py-3 text-sm font-semibold text-emerald-600 shadow-sm hover:bg-emerald-50"
          >
            Get Started Free
          </Link>
        </div>
      </div>
    </section>
  );
}
