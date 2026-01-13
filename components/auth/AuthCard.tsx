import React from 'react';

export default function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="w-full max-w-5xl rounded-2xl border border-zinc-200 bg-white px-10 py-10 shadow-sm">
      <div className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
          {title}
        </h1>
        <p className="mt-2 text-sm text-zinc-600 sm:text-base">{subtitle}</p>
      </div>

      <div className="mx-auto mt-10 w-full max-w-4xl">{children}</div>

      {footer ? <div className="mx-auto mt-8 w-full max-w-4xl">{footer}</div> : null}
    </div>
  );
}
