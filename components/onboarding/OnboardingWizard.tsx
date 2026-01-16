"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type DietPref = "veg" | "nonveg" | "eggetarian" | "vegan";
type Goal = "muscle_gain" | "weight_gain" | "fat_loss" | "maintenance";
type Activity = "low" | "medium" | "high";
type Experience = "beginner" | "intermediate" | "advanced";
type Location = "home" | "gym";
type Gender = "male" | "female" | "other" | "prefer_not";
type MealsPerDay = "3" | "4" | "5";
type SleepSchedule = "early" | "moderate" | "night";

type FormState = {
  heightCm: string;
  weightKg: string;
  age: string;
  gender: Gender;

  profession: string;
  workStart: string;
  workEnd: string;
  activityLevel: Activity;
  sleepSchedule: SleepSchedule;

  dietPreference: DietPref;
  allergies: string; // mandatory (use "none" if not applicable)
  mealsPerDay: MealsPerDay;

  goal: Goal;
  experience: Experience;
  workoutLocation: Location;
  workoutMinutesPerDay: string;
};

const steps = [
  { title: "Basics" },
  { title: "Lifestyle" },
  { title: "Diet" },
  { title: "Fitness" },
] as const;

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-slate-900">{label}</label>
      {children}
    </div>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "h-11 w-full rounded-xl bg-slate-100 px-4 text-sm text-slate-900 outline-none ring-0",
        "placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-emerald-200",
        props.className
      )}
    />
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        "h-11 w-full rounded-xl bg-slate-100 px-4 text-sm text-slate-900 outline-none",
        "focus:bg-white focus:ring-2 focus:ring-emerald-200",
        props.className
      )}
    />
  );
}

function StepperInput({
  value,
  onChange,
  placeholder,
  min,
  max,
  step = 1,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  min: number;
  max: number;
  step?: number;
}) {
  const num = Number(value);
  const base = Number.isFinite(num) ? num : min;

  function clampLocal(n: number): number {
    return Math.max(min, Math.min(max, n));
  }

  function dec() {
    onChange(String(clampLocal(base - step)));
  }

  function inc() {
    onChange(String(clampLocal(base + step)));
  }

  return (
    <div className="relative">
      <Input
        type="text"
        value={value}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw.trim() === "") {
            onChange("");
            return;
          }
          const cleaned = raw.replace(/[^\d]/g, "");
          onChange(cleaned);
        }}
        placeholder={placeholder}
        inputMode="numeric"
        className="pr-14"
      />

      <div className="absolute right-2 top-1/2 -translate-y-1/2">
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <button
            type="button"
            onClick={inc}
            className="grid h-[18px] w-9 place-items-center border-b border-slate-200 text-slate-700 hover:bg-slate-50 active:scale-[0.99]"
            aria-label="Increase"
          >
            <span className="text-[10px] leading-none">▲</span>
          </button>

          <button
            type="button"
            onClick={dec}
            className="grid h-[18px] w-9 place-items-center text-slate-700 hover:bg-slate-50 active:scale-[0.99]"
            aria-label="Decrease"
          >
            <span className="text-[10px] leading-none">▼</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function PillChoice({
  title,
  subtitle,
  active,
  onClick,
}: {
  title: string;
  subtitle: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-xl border px-4 py-4 text-left transition",
        active
          ? "border-emerald-600 bg-emerald-50"
          : "border-slate-200 bg-white hover:bg-slate-50"
      )}
    >
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
    </button>
  );
}

function DietTile({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-xl border px-4 py-4 text-center text-sm font-semibold transition",
        active
          ? "border-emerald-600 bg-emerald-50 text-emerald-700"
          : "border-slate-200 bg-white text-slate-900 hover:bg-slate-50"
      )}
    >
      {label}
    </button>
  );
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "Something went wrong";
}

function isValidTime(t: string): boolean {
  return /^\d{2}:\d{2}$/.test(t);
}

export default function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  const [form, setForm] = useState<FormState>({
    heightCm: "170",
    weightKg: "70",
    age: "30",
    gender: "prefer_not",

    profession: "",
    workStart: "10:30",
    workEnd: "20:00",
    activityLevel: "low",
    sleepSchedule: "moderate",

    dietPreference: "veg",
    allergies: "none",
    mealsPerDay: "3",

    goal: "muscle_gain",
    experience: "beginner",
    workoutLocation: "home",
    workoutMinutesPerDay: "35",
  });

  const progress = useMemo(
    () => Math.round(((step + 1) / steps.length) * 100),
    [step]
  );
  const canGoBack = step > 0;

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  function validateCurrentStep(): string | null {
    if (step === 0) {
      if (!form.heightCm.trim()) return "Height is required";
      if (!form.weightKg.trim()) return "Weight is required";
      if (!form.age.trim()) return "Age is required";
      if (!form.gender) return "Gender is required";
      return null;
    }

    if (step === 1) {
      if (!form.profession.trim()) return "Profession is required";
      if (!form.activityLevel) return "Activity level is required";
      if (!form.sleepSchedule) return "Sleep schedule is required";
      if (!form.workStart || !isValidTime(form.workStart)) return "Work start time is required";
      if (!form.workEnd || !isValidTime(form.workEnd)) return "Work end time is required";
      return null;
    }

    if (step === 2) {
      if (!form.dietPreference) return "Diet type is required";
      if (!form.allergies.trim()) return "Allergies/Restrictions is required (use 'none' if not applicable)";
      if (!form.mealsPerDay) return "Meals per day is required";
      return null;
    }

    if (step === 3) {
      if (!form.goal) return "Goal is required";
      if (!form.experience) return "Experience is required";
      if (!form.workoutLocation) return "Workout location is required";
      if (!form.workoutMinutesPerDay.trim()) return "Workout minutes is required";
      return null;
    }

    return null;
  }

  async function onNext() {
    const err = validateCurrentStep();
    if (err) {
      alert(err);
      return;
    }

    if (step < steps.length - 1) {
      setStep((s) => s + 1);
      return;
    }

    const userEmail = localStorage.getItem("rf_email") ?? "";
    if (!userEmail) {
      alert("No login found. Please log in again.");
      router.replace("/login");
      return;
    }

    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userEmail, ...form }),
      });

      const text = await res.text();
      const json = text ? (JSON.parse(text) as unknown) : null;

      if (!res.ok) {
        const msg =
          typeof json === "object" && json !== null && "message" in json
            ? String((json as { message: unknown }).message)
            : "Failed to save profile";
        throw new Error(msg);
      }

      router.replace("/dashboard");
    } catch (e: unknown) {
      alert(getErrorMessage(e));
    }
  }

  function onBack() {
    if (!canGoBack) return;
    setStep((s) => s - 1);
  }

  const heading =
    step === 0
      ? "Let's start with the basics"
      : step === 1
      ? "Tell us about your lifestyle"
      : step === 2
      ? "Let's plan your nutrition"
      : "Set your workout preferences";

  const subheading =
    step === 0
      ? "This helps us personalize your routine and nutrition plan"
      : step === 1
      ? "We'll build a routine that fits your schedule"
      : step === 2
      ? "We'll create meal plans that match your preferences"
      : "We’ll match workouts to your goal, experience, and available time.";

  return (
    <div className="min-h-screen">
      <div className="border-b border-slate-100 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-emerald-600 text-white">
              <span className="text-sm font-bold">◎</span>
            </div>
            <span className="text-lg font-semibold text-slate-900">RoutineForge</span>
          </div>

          <div className="text-sm text-slate-500">
            Step {step + 1} of {steps.length}
          </div>
        </div>

        <div className="mx-auto max-w-6xl px-6 pb-4">
          <div className="h-2 w-full rounded-full bg-emerald-100">
            <div className="h-2 rounded-full bg-emerald-600 transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      <div className="grid place-items-center px-4 py-14">
        <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="px-10 py-9">
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900">{heading}</h2>
            <p className="mt-2 text-sm text-slate-600">{subheading}</p>

            <div className="mt-8 grid grid-cols-1 gap-6">
              {step === 0 && (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <Field label="Height (cm)">
                    <StepperInput value={form.heightCm} onChange={(v) => update("heightCm", v)} placeholder="170" min={120} max={230} />
                  </Field>

                  <Field label="Weight (kg)">
                    <StepperInput value={form.weightKg} onChange={(v) => update("weightKg", v)} placeholder="70" min={30} max={200} />
                  </Field>

                  <Field label="Age">
                    <StepperInput value={form.age} onChange={(v) => update("age", v)} placeholder="30" min={10} max={90} />
                  </Field>

                  <Field label="Gender">
                    <Select value={form.gender} onChange={(e) => update("gender", e.target.value as Gender)}>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                      <option value="prefer_not">Prefer not to say</option>
                    </Select>
                  </Field>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-900">Profession</label>
                    <Select value={form.profession} onChange={(e) => update("profession", e.target.value)}>
                      <option value="">Select your profession</option>
                      <option value="Software Developer">Software Developer</option>
                      <option value="Designer">Designer</option>
                      <option value="Manager">Manager</option>
                      <option value="Consultant">Consultant</option>
                      <option value="Entrepreneur">Entrepreneur</option>
                      <option value="Student">Student</option>
                      <option value="Other">Other</option>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <Field label="Work start time">
                      <Input type="time" value={form.workStart} onChange={(e) => update("workStart", e.target.value)} />
                    </Field>

                    <Field label="Work end time">
                      <Input type="time" value={form.workEnd} onChange={(e) => update("workEnd", e.target.value)} />
                    </Field>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-900">Current Activity Level</label>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <PillChoice title="Low" subtitle="Mostly sedentary" active={form.activityLevel === "low"} onClick={() => update("activityLevel", "low")} />
                      <PillChoice title="Medium" subtitle="Light exercise" active={form.activityLevel === "medium"} onClick={() => update("activityLevel", "medium")} />
                      <PillChoice title="High" subtitle="Very active" active={form.activityLevel === "high"} onClick={() => update("activityLevel", "high")} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-900">Sleep Schedule Preference</label>
                    <Select value={form.sleepSchedule} onChange={(e) => update("sleepSchedule", e.target.value as SleepSchedule)}>
                      <option value="early">Early Bird (sleep by 10 PM)</option>
                      <option value="moderate">Moderate (sleep by 11-12 PM)</option>
                      <option value="night">Night Owl (sleep after 12 AM)</option>
                    </Select>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-900">Diet Type</label>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <DietTile label="Vegetarian" active={form.dietPreference === "veg"} onClick={() => update("dietPreference", "veg")} />
                      <DietTile label="Non-Vegetarian" active={form.dietPreference === "nonveg"} onClick={() => update("dietPreference", "nonveg")} />
                      <DietTile label="Eggetarian" active={form.dietPreference === "eggetarian"} onClick={() => update("dietPreference", "eggetarian")} />
                      <DietTile label="Vegan" active={form.dietPreference === "vegan"} onClick={() => update("dietPreference", "vegan")} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-900">Food Allergies or Restrictions</label>
                    <Input
                      placeholder="Type 'none' if not applicable"
                      value={form.allergies}
                      onChange={(e) => update("allergies", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-900">Meals per Day</label>
                    <Select value={form.mealsPerDay} onChange={(e) => update("mealsPerDay", e.target.value as MealsPerDay)}>
                      <option value="3">3 meals</option>
                      <option value="4">4 meals</option>
                      <option value="5">5 meals</option>
                    </Select>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <Field label="Goal">
                    <Select value={form.goal} onChange={(e) => update("goal", e.target.value as Goal)}>
                      <option value="muscle_gain">Muscle gain</option>
                      <option value="weight_gain">Weight gain</option>
                      <option value="fat_loss">Fat loss</option>
                      <option value="maintenance">Maintenance</option>
                    </Select>
                  </Field>

                  <Field label="Experience">
                    <Select value={form.experience} onChange={(e) => update("experience", e.target.value as Experience)}>
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </Select>
                  </Field>

                  <Field label="Workout location">
                    <Select value={form.workoutLocation} onChange={(e) => update("workoutLocation", e.target.value as Location)}>
                      <option value="home">Home</option>
                      <option value="gym">Gym</option>
                    </Select>
                  </Field>

                  <Field label="Workout time per day (minutes)">
                    <StepperInput value={form.workoutMinutesPerDay} onChange={(v) => update("workoutMinutesPerDay", v)} placeholder="35" min={10} max={120} step={5} />
                  </Field>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 px-10 py-6">
            <button
              onClick={() => canGoBack && setStep((s) => s - 1)}
              className={cn(
                "inline-flex items-center gap-2 text-sm font-medium",
                canGoBack ? "text-slate-700 hover:text-slate-900" : "cursor-not-allowed text-slate-300"
              )}
              disabled={!canGoBack}
            >
              <span className="text-lg leading-none">‹</span>
              Back
            </button>

            <button
              onClick={onNext}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-600 active:scale-[0.99]"
            >
              {step === steps.length - 1 ? "Generate my plan" : "Next"}
              <span className="text-lg leading-none">›</span>
            </button>
          </div>
        </div>

        <div className="fixed bottom-6 right-6 grid h-10 w-10 place-items-center rounded-full bg-slate-900 text-white shadow-lg">
          ?
        </div>
      </div>
    </div>
  );
}
