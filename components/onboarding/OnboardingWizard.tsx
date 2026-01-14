"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type DietPref = "veg" | "nonveg" | "eggetarian" | "vegan";
type Goal = "muscle_gain" | "weight_gain" | "fat_loss" | "maintenance";
type Activity = "low" | "medium" | "high";
type Experience = "beginner" | "intermediate" | "advanced";
type Location = "home" | "gym";
type Gender = "" | "male" | "female" | "other" | "prefer_not";
type MealsPerDay = "3" | "4" | "5";

type FormState = {
  heightCm: string;
  weightKg: string;
  age: string;
  gender: Gender;

  profession: string;
  workStart: string;
  workEnd: string;
  activityLevel: Activity;

  dietPreference: DietPref;
  allergies: string;
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
      <label className="text-sm font-medium text-slate-900">{label}</label>
      {children}
    </div>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "h-10 w-full rounded-lg bg-slate-100 px-3 text-sm text-slate-900 outline-none ring-0",
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
        "h-10 w-full rounded-lg bg-slate-100 px-3 text-sm text-slate-900 outline-none",
        "focus:bg-white focus:ring-2 focus:ring-emerald-200",
        props.className
      )}
    />
  );
}

// ---- strict parsers (no `any`) ----
function parseGender(v: string): Gender {
  if (v === "male" || v === "female" || v === "other" || v === "prefer_not") return v;
  return "";
}

function parseActivity(v: string): Activity {
  if (v === "low" || v === "medium" || v === "high") return v;
  return "low";
}

function parseDietPref(v: string): DietPref {
  if (v === "veg" || v === "nonveg" || v === "eggetarian" || v === "vegan") return v;
  return "veg";
}

function parseMealsPerDay(v: string): MealsPerDay {
  if (v === "3" || v === "4" || v === "5") return v;
  return "4";
}

function parseGoal(v: string): Goal {
  if (v === "muscle_gain" || v === "weight_gain" || v === "fat_loss" || v === "maintenance") return v;
  return "muscle_gain";
}

function parseExperience(v: string): Experience {
  if (v === "beginner" || v === "intermediate" || v === "advanced") return v;
  return "beginner";
}

function parseLocation(v: string): Location {
  if (v === "home" || v === "gym") return v;
  return "home";
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "Something went wrong";
}

export default function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  const [form, setForm] = useState<FormState>({
    heightCm: "",
    weightKg: "",
    age: "",
    gender: "",

    profession: "Software Developer",
    workStart: "10:30",
    workEnd: "20:00",
    activityLevel: "low",

    dietPreference: "veg",
    allergies: "",
    mealsPerDay: "4",

    goal: "muscle_gain",
    experience: "beginner",
    workoutLocation: "home",
    workoutMinutesPerDay: "35",
  });

  const progress = useMemo(() => {
    return Math.round(((step + 1) / steps.length) * 100);
  }, [step]);

  const canGoBack = step > 0;

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  function validateCurrentStep(): string | null {
    if (step === 0) {
      if (!form.heightCm.trim()) return "Height is required";
      if (!form.weightKg.trim()) return "Weight is required";
      if (!form.age.trim()) return "Age is required";
      return null;
    }
    if (step === 1) {
      if (!form.profession.trim()) return "Profession is required";
      if (!form.workStart) return "Work start time is required";
      if (!form.workEnd) return "Work end time is required";
      return null;
    }
    if (step === 2) {
      if (!form.dietPreference) return "Diet preference is required";
      if (!form.mealsPerDay) return "Meals per day is required";
      return null;
    }
    if (step === 3) {
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

  // ✅ get email saved during login/signup
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

    const data = (await res.json()) as unknown;

    if (!res.ok) {
      const msg =
        typeof data === "object" && data !== null && "message" in data
          ? String((data as { message: unknown }).message)
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

  return (
    <div className="min-h-screen">
      {/* Top bar */}
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

        {/* Progress bar */}
        <div className="mx-auto max-w-6xl px-6 pb-4">
          <div className="h-2 w-full rounded-full bg-emerald-100">
            <div
              className="h-2 rounded-full bg-emerald-600 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Center content */}
      <div className="grid place-items-center px-4 py-14">
        <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="px-8 py-7">
            <h2 className="text-2xl font-semibold text-slate-900">
              {step === 0 && "Let's start with the basics"}
              {step === 1 && "Tell us about your day"}
              {step === 2 && "Set your meal preferences"}
              {step === 3 && "Set your workout preferences"}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              {step === 0 && "This helps us personalize your routine and nutrition plan."}
              {step === 1 && "We’ll align your schedule to your working hours and energy levels."}
              {step === 2 && "Diet preference and allergies help us generate safe, realistic meals."}
              {step === 3 && "We’ll match workouts to your goal, experience, and available time."}
            </p>

            <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
              {step === 0 && (
                <>
                  <Field label="Height (cm)">
                    <Input
                      placeholder="170"
                      inputMode="numeric"
                      value={form.heightCm}
                      onChange={(e) => update("heightCm", e.target.value)}
                    />
                  </Field>

                  <Field label="Weight (kg)">
                    <Input
                      placeholder="70"
                      inputMode="numeric"
                      value={form.weightKg}
                      onChange={(e) => update("weightKg", e.target.value)}
                    />
                  </Field>

                  <Field label="Age">
                    <Input
                      placeholder="30"
                      inputMode="numeric"
                      value={form.age}
                      onChange={(e) => update("age", e.target.value)}
                    />
                  </Field>

                  <Field label="Gender (Optional)">
                    <Select
                      value={form.gender}
                      onChange={(e) => update("gender", parseGender(e.target.value))}
                    >
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                      <option value="prefer_not">Prefer not to say</option>
                    </Select>
                  </Field>
                </>
              )}

              {step === 1 && (
                <>
                  <Field label="Profession">
                    <Input
                      placeholder="Software Developer"
                      value={form.profession}
                      onChange={(e) => update("profession", e.target.value)}
                    />
                  </Field>

                  <Field label="Activity Level">
                    <Select
                      value={form.activityLevel}
                      onChange={(e) => update("activityLevel", parseActivity(e.target.value))}
                    >
                      <option value="low">Low (mostly desk)</option>
                      <option value="medium">Medium (some movement)</option>
                      <option value="high">High (active job)</option>
                    </Select>
                  </Field>

                  <Field label="Work start time">
                    <Input
                      type="time"
                      value={form.workStart}
                      onChange={(e) => update("workStart", e.target.value)}
                    />
                  </Field>

                  <Field label="Work end time">
                    <Input
                      type="time"
                      value={form.workEnd}
                      onChange={(e) => update("workEnd", e.target.value)}
                    />
                  </Field>
                </>
              )}

              {step === 2 && (
                <>
                  <Field label="Diet preference">
                    <Select
                      value={form.dietPreference}
                      onChange={(e) => update("dietPreference", parseDietPref(e.target.value))}
                    >
                      <option value="veg">Vegetarian</option>
                      <option value="eggetarian">Eggetarian</option>
                      <option value="vegan">Vegan</option>
                      <option value="nonveg">Non-veg</option>
                    </Select>
                  </Field>

                  <Field label="Meals per day">
                    <Select
                      value={form.mealsPerDay}
                      onChange={(e) => update("mealsPerDay", parseMealsPerDay(e.target.value))}
                    >
                      <option value="3">3 meals</option>
                      <option value="4">4 meals</option>
                      <option value="5">5 meals</option>
                    </Select>
                  </Field>

                  <div className="sm:col-span-2">
                    <Field label="Allergies / Restrictions (optional)">
                      <Input
                        placeholder="e.g., lactose, peanuts, gluten"
                        value={form.allergies}
                        onChange={(e) => update("allergies", e.target.value)}
                      />
                      <p className="mt-1 text-xs text-slate-500">
                        Use commas to separate multiple items.
                      </p>
                    </Field>
                  </div>
                </>
              )}

              {step === 3 && (
                <>
                  <Field label="Goal">
                    <Select
                      value={form.goal}
                      onChange={(e) => update("goal", parseGoal(e.target.value))}
                    >
                      <option value="muscle_gain">Muscle gain</option>
                      <option value="weight_gain">Weight gain</option>
                      <option value="fat_loss">Fat loss</option>
                      <option value="maintenance">Maintenance</option>
                    </Select>
                  </Field>

                  <Field label="Experience">
                    <Select
                      value={form.experience}
                      onChange={(e) => update("experience", parseExperience(e.target.value))}
                    >
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </Select>
                  </Field>

                  <Field label="Workout location">
                    <Select
                      value={form.workoutLocation}
                      onChange={(e) => update("workoutLocation", parseLocation(e.target.value))}
                    >
                      <option value="home">Home</option>
                      <option value="gym">Gym</option>
                    </Select>
                  </Field>

                  <Field label="Workout time per day (minutes)">
                    <Input
                      placeholder="35"
                      inputMode="numeric"
                      value={form.workoutMinutesPerDay}
                      onChange={(e) => update("workoutMinutesPerDay", e.target.value)}
                    />
                  </Field>
                </>
              )}
            </div>
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-between border-t border-slate-100 px-8 py-5">
            <button
              onClick={onBack}
              className={cn(
                "inline-flex items-center gap-2 text-sm",
                canGoBack
                  ? "text-slate-600 hover:text-slate-900"
                  : "cursor-not-allowed text-slate-300"
              )}
              disabled={!canGoBack}
            >
              <span className="text-lg leading-none">‹</span>
              Back
            </button>

            <button
              onClick={onNext}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 active:scale-[0.99]"
            >
              {step === steps.length - 1 ? "generate my plan" : "Next"}
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
