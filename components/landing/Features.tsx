import React from 'react';

type Feature = {
  title: string;
  desc: string;
  icon: React.ReactNode;
};

function IconWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
      {children}
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="stroke-current">
      <path d="M8 2v3M16 2v3" strokeWidth="2" strokeLinecap="round" />
      <path d="M3.5 9h17" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M6 4h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MealIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="stroke-current">
      <path d="M6 2v10" strokeWidth="2" strokeLinecap="round" />
      <path d="M10 2v10" strokeWidth="2" strokeLinecap="round" />
      <path d="M6 7h4" strokeWidth="2" strokeLinecap="round" />
      <path d="M14 2v20" strokeWidth="2" strokeLinecap="round" />
      <path d="M18 2v6a3 3 0 0 1-3 3h-1" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function DumbbellIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="stroke-current">
      <path d="M4 10v4" strokeWidth="2" strokeLinecap="round" />
      <path d="M20 10v4" strokeWidth="2" strokeLinecap="round" />
      <path d="M7 9v6" strokeWidth="2" strokeLinecap="round" />
      <path d="M17 9v6" strokeWidth="2" strokeLinecap="round" />
      <path d="M7 12h10" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ProgressIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="stroke-current">
      <path d="M4 19V5" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 19h16" strokeWidth="2" strokeLinecap="round" />
      <path d="M7 15l4-4 3 3 5-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Features() {
  const features: Feature[] = [
    {
      title: 'Personalized Routine',
      desc: 'Get a daily schedule that fits your lifestyle, work hours, and goals.',
      icon: <CalendarIcon />,
    },
    {
      title: 'Smart Meal Plans',
      desc: 'Customized nutrition plans based on your diet preferences and goals.',
      icon: <MealIcon />,
    },
    {
      title: 'Adaptive Workouts',
      desc: 'Home or gym workouts that match your experience and available time.',
      icon: <DumbbellIcon />,
    },
    {
      title: 'Progress Tracking',
      desc: 'Clear insights and reports to keep you motivated and on track.',
      icon: <ProgressIcon />,
    },
  ];

  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-zinc-900 md:text-5xl">
            Everything you need to build better habits
          </h2>
          <p className="mt-4 text-base leading-7 text-zinc-600 md:text-lg">
            RoutineForge brings structure to your day without the complexity. Simple, effective,
            and designed for real life.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-zinc-200 bg-white p-7 shadow-sm"
            >
              <IconWrap>{f.icon}</IconWrap>
              <h3 className="text-lg font-semibold text-zinc-900">{f.title}</h3>
              <p className="mt-3 text-sm leading-6 text-zinc-600">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
