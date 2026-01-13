type Step = {
  num: string;
  title: string;
  desc: string;
};

export default function Steps() {
  const steps: Step[] = [
    {
      num: '1',
      title: 'Tell us about you',
      desc: 'Answer a few questions about your lifestyle, goals, and preferences.',
    },
    {
      num: '2',
      title: 'Get your personalized plan',
      desc: 'Receive a custom routine, meal plan, and workout schedule instantly.',
    },
    {
      num: '3',
      title: 'Track and improve',
      desc: 'Log your progress daily and watch your consistency build over time.',
    },
  ];

  return (
    <section className="bg-[#f7f1ea] py-24">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="text-center text-3xl font-semibold tracking-tight text-zinc-900 md:text-5xl">
          Get started in 3 simple steps
        </h2>

        <div className="mt-16 grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-12">
          {steps.map((s) => (
            <div key={s.num} className="text-center">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-emerald-500 text-xl font-semibold text-white shadow-sm">
                {s.num}
              </div>

              <h3 className="mt-6 text-lg font-semibold text-zinc-900">{s.title}</h3>
              <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-zinc-600">
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
