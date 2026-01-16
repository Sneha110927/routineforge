"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";

type Suggestion = {
  title: string;
  timeMin: number;
  uses: string[];
  missingOptional: string[];
  steps: string[];
};

type ApiOk = { ok: true; suggestions: Suggestion[] };
type ApiFail = { ok: false; message: string };
type ApiResp = ApiOk | ApiFail;

function cn(...c: Array<string | false | null | undefined>) {
  return c.filter(Boolean).join(" ");
}

const POPULAR = [
  "Chicken",
  "Eggs",
  "Paneer",
  "Tofu",
  "Fish",
  "Shrimp",
  "Mutton",
  "Chickpeas",
  "Lentils",
  "Beans",
  "Onion",
  "Tomato",
] as const;

export default function RecipeFinderClient() {
  const [q, setQ] = useState("");
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [results, setResults] = useState<Suggestion[] | null>(null);

  const countLabel = useMemo(() => `${ingredients.length} ingredient${ingredients.length === 1 ? "" : "s"}`, [ingredients.length]);

  function addIngredient(v: string) {
    const s = v.trim();
    if (!s) return;
    const norm = s.toLowerCase();
    setIngredients((p) => (p.some((x) => x.toLowerCase() === norm) ? p : [...p, s]));
  }

  function removeIngredient(v: string) {
    setIngredients((p) => p.filter((x) => x !== v));
  }

  async function findRecipes() {
    const userEmail = localStorage.getItem("rf_email") ?? "";
    if (!userEmail) {
      setErr("No login found. Please log in again.");
      return;
    }
    if (ingredients.length === 0) {
      setErr("Please add at least 1 ingredient.");
      return;
    }

    setBusy(true);
    setErr(null);
    setResults(null);

    try {
      const res = await fetch("/api/recipes/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userEmail, ingredients }),
      });

      const text = await res.text();
      let json: ApiResp;
      try {
        json = text ? (JSON.parse(text) as ApiResp) : { ok: false, message: "Empty response" };
      } catch {
        json = { ok: false, message: "Invalid server response" };
      }

      if (!res.ok || !json.ok) {
        const msg = "message" in json ? json.message : "Failed to get recipes";
        throw new Error(msg);
      }

      setResults(json.suggestions);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to get recipes");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-white">
      {/* Top bar (exact style) */}
      <div className="sticky top-0 z-20 border-b border-slate-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/dashboard" className="text-sm text-slate-600 hover:text-slate-900">
            ← Back
          </Link>

          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-emerald-600 text-white">
              <span className="text-sm font-bold">◎</span>
            </div>
            <span className="text-lg font-semibold text-slate-900">Recipe Finder</span>
          </div>

          <button className="grid h-9 w-9 place-items-center rounded-xl hover:bg-slate-50" aria-label="Theme">
            🌙
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 py-12">
        <div className="text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
            ✨
          </div>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight text-slate-900">
            What&apos;s in your kitchen?
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Tell us what ingredients you have, and we&apos;ll suggest some healthy and delicious recipes you can make right now!
          </p>
        </div>

        {/* Input card */}
        <div className="mx-auto mt-10 w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 rounded-xl bg-slate-100 px-4 py-3">
            <span className="text-slate-500">🔎</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Type an ingredient (e.g., chicken, tomato, rice)..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  addIngredient(q);
                  setQ("");
                }
              }}
              disabled={busy}
            />
          </div>

          {/* Selected chips */}
          {ingredients.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {ingredients.map((it) => (
                <button
                  key={it}
                  type="button"
                  onClick={() => removeIngredient(it)}
                  className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                  title="Remove"
                >
                  {it} <span className="text-emerald-700/70">✕</span>
                </button>
              ))}
            </div>
          ) : null}

          <button
            type="button"
            onClick={findRecipes}
            disabled={busy || ingredients.length === 0}
            className={cn(
              "mt-5 w-full rounded-xl px-5 py-3 text-sm font-semibold text-white",
              busy || ingredients.length === 0
                ? "bg-emerald-300 cursor-not-allowed"
                : "bg-emerald-600 hover:bg-emerald-700"
            )}
          >
            {busy ? "Finding recipes..." : `Find Recipes (${countLabel})`}
          </button>

          {err ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {err}
            </div>
          ) : null}
        </div>

        {/* Popular ingredients */}
        <div className="mx-auto mt-10 max-w-4xl">
          <p className="text-xs text-slate-500">Popular ingredients:</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {POPULAR.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => addIngredient(p)}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-50 disabled:opacity-60"
              >
                <span className="text-slate-500">＋</span> {p}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        {results ? (
          <div className="mx-auto mt-12 max-w-6xl">
            <h2 className="text-lg font-semibold text-slate-900">Recipe suggestions</h2>
            <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
              {results.map((r) => (
                <div key={r.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{r.title}</p>
                      <p className="mt-1 text-xs text-slate-500">{r.timeMin} min</p>
                    </div>
                    <div className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                      Uses {r.uses.length}
                    </div>
                  </div>

                  {r.uses.length > 0 ? (
                    <div className="mt-4">
                      <p className="text-xs font-semibold text-slate-900">Uses</p>
                      <p className="mt-1 text-xs text-slate-600">{r.uses.join(", ")}</p>
                    </div>
                  ) : null}

                  {r.missingOptional.length > 0 ? (
                    <div className="mt-3">
                      <p className="text-xs font-semibold text-slate-900">Optional</p>
                      <p className="mt-1 text-xs text-slate-600">{r.missingOptional.join(", ")}</p>
                    </div>
                  ) : null}

                  {r.steps.length > 0 ? (
                    <div className="mt-4">
                      <p className="text-xs font-semibold text-slate-900">Steps</p>
                      <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs text-slate-700">
                        {r.steps.slice(0, 6).map((s) => (
                          <li key={s}>{s}</li>
                        ))}
                      </ol>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="fixed bottom-6 right-6 grid h-10 w-10 place-items-center rounded-full bg-slate-900 text-white shadow-lg">
        ?
      </div>
    </main>
  );
}
