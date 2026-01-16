import { NextResponse } from "next/server";
import { GoogleGenerativeAI, type GenerativeModel } from "@google/generative-ai";

export const runtime = "nodejs";

type Body = {
  ingredients?: unknown;
  diet?: unknown;
  goal?: unknown;
  allergies?: unknown;
};

type Suggestion = {
  title: string;
  timeMin: number;
  uses: string[];
  missingOptional?: string[];
  steps: string[];
};

type Ok = { ok: true; suggestions: Suggestion[]; source: "ai" | "cache" };
type Fail = { ok: false; message: string };

function mustEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}

function safeStr(v: unknown, def: string): string {
  return typeof v === "string" && v.trim() ? v.trim() : def;
}

function cleanList(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is string => typeof x === "string")
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 30);
}

function extractJsonObject(raw: string): string | null {
  const s = raw.trim();

  const fence = /```(?:json)?\s*([\s\S]*?)\s*```/i.exec(s);
  if (fence?.[1]) {
    const inside = fence[1].trim();
    if (inside.startsWith("{") && inside.endsWith("}")) return inside;
  }

  const first = s.indexOf("{");
  if (first === -1) return null;

  let depth = 0;
  for (let i = first; i < s.length; i++) {
    const ch = s[i];
    if (ch === "{") depth++;
    if (ch === "}") depth--;
    if (depth === 0) return s.slice(first, i + 1).trim();
  }
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function generate(model: GenerativeModel, prompt: string): Promise<string> {
  const res = await model.generateContent(prompt);
  return res.response.text();
}

async function generateWithRetry(model: GenerativeModel, prompt: string): Promise<string> {
  const delays = [0, 700, 1500];
  let lastErr: unknown = null;

  for (const d of delays) {
    if (d > 0) await sleep(d);
    try {
      return await generate(model, prompt);
    } catch (e: unknown) {
      lastErr = e;
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error("Model call failed");
}

function normalizeSuggestions(parsed: unknown): Suggestion[] {
  const obj = parsed as { suggestions?: unknown };
  const arr = Array.isArray(obj.suggestions) ? obj.suggestions : [];

  const suggestions = arr.map((s) => {
    const it = s as {
      title?: unknown;
      timeMin?: unknown;
      uses?: unknown;
      missingOptional?: unknown;
      steps?: unknown;
    };

    return {
      title: typeof it.title === "string" ? it.title : "Healthy recipe",
      timeMin: typeof it.timeMin === "number" ? it.timeMin : 20,
      uses: Array.isArray(it.uses) ? it.uses.map(String) : [],
      missingOptional: Array.isArray(it.missingOptional) ? it.missingOptional.map(String) : [],
      steps: Array.isArray(it.steps) ? it.steps.map(String) : [],
    };
  });

  return suggestions
    .filter((x) => x.title.trim().length > 0 && x.steps.length > 0)
    .slice(0, 6);
}

/* -------------------- STRICT ENFORCEMENT -------------------- */
/** Requirement: EVERY user-provided ingredient must be used in EVERY recipe. */

function norm(s: string): string {
  return s.trim().toLowerCase();
}

function recipeUsesAllIngredients(recipeUses: string[], userIngredients: string[]): boolean {
  const uses = recipeUses.map(norm);

  return userIngredients.every((ing) => {
    const k = norm(ing);
    return uses.some((u) => u.includes(k) || k.includes(u));
  });
}

function enforceAllIngredients(suggestions: Suggestion[], userIngredients: string[]): Suggestion[] {
  return suggestions.filter((s) => recipeUsesAllIngredients(s.uses, userIngredients));
}

/* -------------------- CACHE -------------------- */

type CacheEntry = { at: number; suggestions: Suggestion[] };
const CACHE_TTL_MS = 1000 * 60 * 30;

declare global {
  // eslint-disable-next-line no-var
  var recipeCache: Record<string, CacheEntry> | undefined;
}

const recipeCache: Record<string, CacheEntry> = global.recipeCache ?? {};
global.recipeCache = recipeCache;

function cacheKey(opts: { diet: string; goal: string; allergies: string; ingredients: string[] }): string {
  const ing = [...opts.ingredients].map((x) => norm(x)).sort().join("|");
  return `${opts.diet}|${opts.goal}|${opts.allergies}|${ing}`.toLowerCase();
}

function getCached(key: string): Suggestion[] | null {
  const v = recipeCache[key];
  if (!v) return null;
  if (Date.now() - v.at > CACHE_TTL_MS) return null;
  return v.suggestions;
}

function setCached(key: string, suggestions: Suggestion[]) {
  recipeCache[key] = { at: Date.now(), suggestions };
}

/* -------------------- PROMPTS -------------------- */

function basePrompt(args: {
  ingredients: string[];
  diet: string;
  goal: string;
  allergies: string;
}): string {
  return `
Return STRICT JSON ONLY. No markdown. No extra text.

You are a HEALTHY recipe assistant.

HEALTH RULES:
- Healthy only (high protein + high fiber)
- Minimal oil; no deep-fry
- Avoid refined sugar; avoid heavy cream/butter
- Prefer whole grains/legumes/lean protein/vegetables
- Indian-friendly
- Respect diet and allergies strictly

CRITICAL RULES (MANDATORY):
- Return MINIMUM 2 recipes (prefer 3).
- EVERY recipe MUST use ALL user-provided ingredients.
- Put ALL user ingredients inside "uses" for each recipe.
- Do not treat any provided ingredient as optional.
- Steps must reflect the use of ALL ingredients.

User ingredients:
${args.ingredients.join(", ")}

Diet: ${args.diet}
Goal: ${args.goal}
Allergies: ${args.allergies}

Output exactly:
{
  "suggestions": [
    {
      "title": "string",
      "timeMin": 20,
      "uses": ["ingredient1","ingredient2"],
      "missingOptional": ["ingredientX"],
      "steps": ["step 1","step 2","step 3"]
    }
  ]
}
`;
}

function regenPrompt(prevRaw: string, ingredients: string[]): string {
  return `
Your previous output was invalid OR did not follow the rules.
Regenerate STRICT JSON only with MINIMUM 2 recipes.

MANDATORY:
- Every recipe must use ALL of these ingredients: ${ingredients.join(", ")}
- Ensure each recipe "uses" list includes ALL of them.

Return ONLY JSON.

Previous output:
${prevRaw}
`;
}

/* -------------------- ROUTE -------------------- */

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;

    const ingredients = cleanList(body.ingredients);
    const diet = safeStr(body.diet, "veg");
    const goal = safeStr(body.goal, "maintenance");
    const allergies = safeStr(body.allergies, "none");

    if (ingredients.length < 2) {
      return NextResponse.json(
        { ok: false, message: "Please add at least 2 ingredients" } satisfies Fail,
        { status: 400 }
      );
    }

    const key = cacheKey({ diet, goal, allergies, ingredients });

    const cached = getCached(key);
    if (cached && cached.length >= 2) {
      return NextResponse.json({ ok: true, suggestions: cached, source: "cache" } satisfies Ok);
    }

    const genAI = new GoogleGenerativeAI(mustEnv("GEMINI_API_KEY"));

    // ✅ As requested: use this single model
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    let prompt = basePrompt({ ingredients, diet, goal, allergies });
    let lastRaw = "";

    for (let attempt = 0; attempt < 3; attempt++) {
      const raw = await generateWithRetry(model, prompt);
      lastRaw = raw;

      const jsonText = extractJsonObject(raw);
      if (!jsonText) {
        prompt = basePrompt({ ingredients, diet, goal, allergies }) + "\n" + regenPrompt(raw, ingredients);
        continue;
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(jsonText);
      } catch {
        prompt = basePrompt({ ingredients, diet, goal, allergies }) + "\n" + regenPrompt(raw, ingredients);
        continue;
      }

      const normalized = normalizeSuggestions(parsed);
      const enforced = enforceAllIngredients(normalized, ingredients);

      // ✅ Must return minimum 2 recipes AND each uses ALL ingredients
      if (enforced.length >= 2) {
        setCached(key, enforced);
        return NextResponse.json({ ok: true, suggestions: enforced, source: "ai" } satisfies Ok);
      }

      // Not enough valid recipes -> regenerate stronger
      prompt = basePrompt({ ingredients, diet, goal, allergies }) + "\n" + regenPrompt(raw, ingredients);
    }

    console.error("AI recipe insufficient/invalid output:", lastRaw);
    return NextResponse.json(
      {
        ok: false,
        message: "AI could not generate 2 recipes using all ingredients. Try adding more common ingredients (e.g., onion, garlic, curd) and retry.",
      } satisfies Fail,
      { status: 503 }
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Recipe API failed";
    console.error("Recipe route error:", msg);
    return NextResponse.json(
      { ok: false, message: "Server error. Please try again." } satisfies Fail,
      { status: 500 }
    );
  }
}
