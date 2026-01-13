'use client';

import React from 'react';

type Props = {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  type?: 'text' | 'email' | 'password';
  icon?: React.ReactNode;
  error?: string | null;
  right?: React.ReactNode;
  autoComplete?: string;
};

export default function TextField({
  label,
  placeholder,
  value,
  onChange,
  type = 'text',
  icon,
  error,
  right,
  autoComplete,
}: Props) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-zinc-900">{label}</label>

      <div
        className={[
          'flex items-center gap-3 rounded-xl px-4 py-3',
          'border bg-white',
          error ? 'border-red-400' : 'border-zinc-900/80', // strong outline like your image
          'focus-within:border-emerald-600',
        ].join(' ')}
      >
        {icon ? <div className="text-zinc-700">{icon}</div> : null}

        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          type={type}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="w-full bg-transparent text-sm text-zinc-900 placeholder:text-zinc-400 outline-none"
        />

        {right ? <div className="shrink-0">{right}</div> : null}
      </div>

      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
