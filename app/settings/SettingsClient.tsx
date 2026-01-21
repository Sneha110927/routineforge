"use client";

import React, { useEffect, useActionState, startTransition, useState } from "react";
import Link from "next/link";
import { Settings, User2, Bell, Shield, Sun, Moon } from "lucide-react";

type DietPref = "veg" | "nonveg" | "eggetarian" | "vegan";
type Goal = "muscle_gain" | "weight_gain" | "fat_loss" | "maintenance";
type Location = "home" | "gym";
type Experience = "beginner" | "intermediate" | "advanced";

type SettingsOk = {
  ok: true;
  account: { name: string; email: string };
  profile: {
    weightKg: string;
    heightCm: string;
    goal: Goal;
    dietPreference: DietPref;
    workoutLocation: Location;
    workoutMinutesPerDay: string;
    experience: Experience;
  };
  preferences: {
    darkMode: boolean;
    dailyReminder: boolean;
    workoutReminder: boolean;
    mealReminder: boolean;
  };
};

type SettingsFail = { ok: false; message: string };
type SettingsResponse = SettingsOk | SettingsFail;

type ViewState =
  | { status: "boot" }
  | { status: "noauth" }
  | { status: "error"; message: string }
  | { status: "ready"; data: SettingsOk };

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "Something went wrong";
}

async function loadSettingsAction(_prev: ViewState, payload: { email: string | null }): Promise<ViewState> {
  const email = (payload.email ?? "").trim();
  if (!email) return { status: "noauth" };

  try {
    const res = await fetch(`/api/settings?email=${encodeURIComponent(email)}`);
    const json = (await res.json()) as SettingsResponse;

    if (!res.ok || !json.ok) {
      const msg = "message" in json ? json.message : "Failed to load settings.";
      return { status: "error", message: msg };
    }

    return { status: "ready", data: json };
  } catch {
    return { status: "error", message: "Failed to load settings." };
  }
}

async function saveSettings(email: string, data: SettingsOk): Promise<void> {
  const res = await fetch("/api/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,

      weightKg: data.profile.weightKg,
      heightCm: data.profile.heightCm,
      goal: data.profile.goal,
      dietPreference: data.profile.dietPreference,
      workoutLocation: data.profile.workoutLocation,
      workoutMinutesPerDay: data.profile.workoutMinutesPerDay,
      experience: data.profile.experience,

      darkMode: data.preferences.darkMode,
      dailyReminder: data.preferences.dailyReminder,
      workoutReminder: data.preferences.workoutReminder,
      mealReminder: data.preferences.mealReminder,
    }),
  });

  const json = (await res.json()) as { ok: boolean; message?: string };
  if (!res.ok || !json.ok) throw new Error(json.message ?? "Failed to save settings");
}

function IconBadge({ children }: { children: React.ReactNode }) {
  return <div className="grid h-10 w-10 place-items-center rounded-full bg-emerald-50 text-emerald-700">{children}</div>;
}

function SectionCard({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-4">
        <IconBadge>{icon}</IconBadge>
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
        </div>
      </div>
      <div className="mt-6">{children}</div>
    </div>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  disabled?: boolean;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="h-11 w-full rounded-xl bg-slate-100 px-4 text-sm outline-none focus:ring-2 focus:ring-emerald-200 disabled:opacity-60"
    />
  );
}

function Select<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: Array<{ value: T; label: string }>;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="h-11 w-full rounded-xl bg-slate-100 px-4 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function ToggleRow({
  title,
  subtitle,
  checked,
  onChange,
}: {
  title: string;
  subtitle: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-6 py-4">
      <div>
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
      </div>

      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={["relative h-6 w-11 rounded-full transition", checked ? "bg-emerald-600" : "bg-slate-200"].join(" ")}
        aria-label={title}
      >
        <span
          className={[
            "absolute top-0.5 h-5 w-5 rounded-full bg-white transition",
            checked ? "left-6" : "left-0.5",
          ].join(" ")}
        />
      </button>
    </div>
  );
}

function PrivacyActions({ email }: { email: string }) {
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function downloadMyData() {
    setMsg(null);
    setDownloading(true);

    try {
      const res = await fetch(`/api/account/export?email=${encodeURIComponent(email)}`);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to export data");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const cd = res.headers.get("content-disposition") ?? "";
      const match = /filename="([^"]+)"/.exec(cd);
      const filename = match?.[1] ?? "routineforge-data.json";

      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);
      setMsg("✅ Download started");
      setTimeout(() => setMsg(null), 1500);
    } catch (e: unknown) {
      setMsg(getErrorMessage(e));
      setTimeout(() => setMsg(null), 2500);
    } finally {
      setDownloading(false);
    }
  }

  async function deleteMyAccount() {
    const ok = window.confirm("This will permanently delete your account, profile, and logs. Do you want to continue?");
    if (!ok) return;

    setMsg(null);
    setDeleting(true);

    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const json = (await res.json()) as { ok: boolean; message?: string };
      if (!res.ok || !json.ok) throw new Error(json.message ?? "Failed to delete account");

      localStorage.removeItem("rf_email");
      localStorage.removeItem("rf_theme");
      document.documentElement.classList.remove("dark");
      window.location.href = "/login";
    } catch (e: unknown) {
      setMsg(getErrorMessage(e));
      setTimeout(() => setMsg(null), 2500);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={downloadMyData}
        disabled={downloading || deleting}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-50 disabled:opacity-60"
      >
        {downloading ? "Preparing download..." : "Download My Data"}
      </button>

      <button
        type="button"
        onClick={deleteMyAccount}
        disabled={downloading || deleting}
        className="w-full rounded-xl border border-red-200 bg-white px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
      >
        {deleting ? "Deleting account..." : "Delete My Account"}
      </button>

      {msg ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">{msg}</div>
      ) : null}
    </div>
  );
}

/* -------------------- THEME (same as dashboard) -------------------- */

type Theme = "light" | "dark";

function readTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const saved = window.localStorage.getItem("rf_theme");
  if (saved === "dark" || saved === "light") return saved;
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? false;
  return prefersDark ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
}

function TopBar({ theme, onToggleTheme }: { theme: Theme; onToggleTheme: () => void }) {
  return (
    <div className="sticky top-0 z-20 border-b border-slate-100 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/dashboard" className="text-sm text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">
          ←
        </Link>

        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-emerald-600 text-white">
            <span className="text-sm font-bold">◎</span>
          </div>
          <span className="text-lg font-semibold text-slate-900 dark:text-slate-50">RoutineForge</span>
        </div>

        <button
          type="button"
          onClick={onToggleTheme}
          className="grid h-9 w-9 place-items-center rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900"
          aria-label="Toggle theme"
          title="Toggle theme"
        >
          {theme === "dark" ? <Sun size={16} className="text-slate-700 dark:text-slate-200" /> : <Moon size={16} className="text-slate-700 dark:text-slate-200" />}
        </button>
      </div>
    </div>
  );
}

export default function SettingsClient() {
  const [view, runLoad] = useActionState(loadSettingsAction, { status: "boot" } as ViewState);

  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const t = readTheme();
    setTheme(t);
    applyTheme(t);
  }, []);

  function toggleTheme() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
    localStorage.setItem("rf_theme", next);
  }

  useEffect(() => {
    const email = localStorage.getItem("rf_email");
    startTransition(() => {
      runLoad({ email });
    });
  }, [runLoad]);

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  async function onSave(data: SettingsOk) {
    setSaving(true);
    setToast(null);
    try {
      await saveSettings(data.account.email, data);
      setToast("✅ Saved successfully");
      setTimeout(() => setToast(null), 1500);
    } catch (e: unknown) {
      setToast(getErrorMessage(e));
      setTimeout(() => setToast(null), 2000);
    } finally {
      setSaving(false);
    }
  }

  function logout() {
    localStorage.removeItem("rf_email");
    window.location.href = "/login";
  }

  return (
    <main className="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <TopBar theme={theme} onToggleTheme={toggleTheme} />

      <div className="mx-auto max-w-4xl px-6 py-10">
        {view.status === "boot" ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
            Loading settings…
          </div>
        ) : view.status === "noauth" ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
            No login found.{" "}
            <Link href="/login" className="font-semibold underline underline-offset-2">
              Go to login
            </Link>
          </div>
        ) : view.status === "error" ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
            {view.message}
          </div>
        ) : (
          <SettingsContent data={view.data} saving={saving} onSave={onSave} onLogout={logout} toast={toast} />
        )}
      </div>

      <div className="fixed bottom-6 right-6 grid h-10 w-10 place-items-center rounded-full bg-slate-900 text-white shadow-lg">
        ?
      </div>
    </main>
  );
}

function SettingsContent({
  data,
  saving,
  onSave,
  onLogout,
  toast,
}: {
  data: SettingsOk;
  saving: boolean;
  onSave: (data: SettingsOk) => void;
  onLogout: () => void;
  toast: string | null;
}) {
  const [local, setLocal] = useState<SettingsOk>(data);

  function updateProfile<K extends keyof SettingsOk["profile"]>(k: K, v: SettingsOk["profile"][K]) {
    setLocal((p) => ({ ...p, profile: { ...p.profile, [k]: v } }));
  }
  function updatePref<K extends keyof SettingsOk["preferences"]>(k: K, v: SettingsOk["preferences"][K]) {
    setLocal((p) => ({ ...p, preferences: { ...p.preferences, [k]: v } }));
  }

  return (
    <>
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">Settings</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Manage your account and preferences</p>
      </div>

      <div className="space-y-6">
        <SectionCard icon={<User2 size={18} />} title="Account Information" subtitle="Your personal details">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-semibold text-slate-900 dark:text-slate-50">Name</p>
              <Input value={local.account.name} onChange={() => {}} placeholder="" disabled />
              <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">Contact support to change your email address</p>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold text-slate-900 dark:text-slate-50">Email</p>
              <Input value={local.account.email} onChange={() => {}} placeholder="" disabled />
            </div>
          </div>
        </SectionCard>

        <SectionCard icon={<Settings size={18} />} title="Profile Settings" subtitle="Update your health and fitness goals">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-semibold text-slate-900 dark:text-slate-50">Current Weight (kg)</p>
              <Input value={local.profile.weightKg} onChange={(v) => updateProfile("weightKg", v)} placeholder="e.g., 70" />
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold text-slate-900 dark:text-slate-50">Height (cm)</p>
              <Input value={local.profile.heightCm} onChange={(v) => updateProfile("heightCm", v)} placeholder="e.g., 170" />
            </div>
          </div>

          <div className="mt-6 border-t border-slate-100 pt-6">
            <p className="mb-2 text-xs font-semibold text-slate-900 dark:text-slate-50">Fitness Goal</p>
            <Select
              value={local.profile.goal}
              onChange={(v) => updateProfile("goal", v)}
              options={[
                { value: "muscle_gain", label: "Muscle Gain" },
                { value: "weight_gain", label: "Weight Gain" },
                { value: "fat_loss", label: "Fat Loss" },
                { value: "maintenance", label: "Maintenance" },
              ]}
            />

            <p className="mb-2 mt-5 text-xs font-semibold text-slate-900 dark:text-slate-50">Diet Type</p>
            <Select
              value={local.profile.dietPreference}
              onChange={(v) => updateProfile("dietPreference", v)}
              options={[
                { value: "veg", label: "Vegetarian" },
                { value: "eggetarian", label: "Eggetarian" },
                { value: "vegan", label: "Vegan" },
                { value: "nonveg", label: "Non-veg" },
              ]}
            />
          </div>

          <div className="mt-6 border-t border-slate-100 pt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-semibold text-slate-900 dark:text-slate-50">Workout Location</p>
              <Select
                value={local.profile.workoutLocation}
                onChange={(v) => updateProfile("workoutLocation", v)}
                options={[
                  { value: "home", label: "Home" },
                  { value: "gym", label: "Gym" },
                ]}
              />
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold text-slate-900 dark:text-slate-50">Workout Duration</p>
              <Select
                value={local.profile.workoutMinutesPerDay}
                onChange={(v) => updateProfile("workoutMinutesPerDay", v)}
                options={[
                  { value: "20", label: "20 minutes" },
                  { value: "30", label: "30 minutes" },
                  { value: "45", label: "45 minutes" },
                  { value: "60", label: "60 minutes" },
                ]}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => onSave(local)}
            disabled={saving}
            className="mt-6 w-full rounded-xl bg-emerald-600 px-5 py-4 text-sm font-semibold text-white hover:bg-emerald-700 disabled:bg-emerald-300"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>

          {toast ? (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
              {toast}
            </div>
          ) : null}
        </SectionCard>

        <SectionCard icon={<Sun size={18} />} title="Appearance" subtitle="Customize how the app looks">
          <ToggleRow
            title="Dark Mode"
            subtitle={local.preferences.darkMode ? "Dark theme is enabled" : "Light theme is enabled"}
            checked={local.preferences.darkMode}
            onChange={(v) => updatePref("darkMode", v)}
          />
        </SectionCard>

        <SectionCard icon={<Bell size={18} />} title="Notifications" subtitle="Manage your notification preferences">
          <div className="divide-y divide-slate-100">
            <ToggleRow
              title="Daily Progress Reminder"
              subtitle="Get reminded to log your daily progress"
              checked={local.preferences.dailyReminder}
              onChange={(v) => updatePref("dailyReminder", v)}
            />
            <ToggleRow
              title="Workout Reminder"
              subtitle="Notification before your workout time"
              checked={local.preferences.workoutReminder}
              onChange={(v) => updatePref("workoutReminder", v)}
            />
            <ToggleRow
              title="Meal Reminder"
              subtitle="Reminders for breakfast, lunch, and dinner"
              checked={local.preferences.mealReminder}
              onChange={(v) => updatePref("mealReminder", v)}
            />
          </div>
        </SectionCard>

        <SectionCard icon={<Shield size={18} />} title="Privacy & Data" subtitle="Control your data and privacy">
          <PrivacyActions email={local.account.email} />
        </SectionCard>

        <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <button
            type="button"
            onClick={onLogout}
            className="w-full rounded-xl bg-red-500 px-5 py-4 text-sm font-semibold text-white hover:bg-red-600"
          >
            Log Out
          </button>
        </div>
      </div>
    </>
  );
}
