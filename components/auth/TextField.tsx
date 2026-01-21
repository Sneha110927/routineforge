"use client";

import React from "react";

type Props = {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  type?: "text" | "email" | "password";
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
  type = "text",
  icon,
  error,
  right,
  autoComplete,
}: Props) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-zinc-900 dark:text-slate-100">
        {label}
      </label>

      <div
        className={[
          "flex items-center gap-3 rounded-xl px-4 py-3",
          "border",
          error ? "border-red-400" : "border-zinc-900/80 dark:border-slate-700",
          "bg-white dark:bg-slate-950",
          "focus-within:border-emerald-600",
        ].join(" ")}
      >
        {icon ? <div className="text-zinc-700 dark:text-slate-300">{icon}</div> : null}

        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          type={type}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="w-full bg-transparent text-sm text-zinc-900 placeholder:text-zinc-400 outline-none dark:text-slate-100 dark:placeholder:text-slate-500"
        />

        {right ? <div className="shrink-0">{right}</div> : null}
      </div>

      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
