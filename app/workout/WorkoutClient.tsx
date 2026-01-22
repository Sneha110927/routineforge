"use client";

import React, {
  useEffect,
  useActionState,
  startTransition,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import {
  Play,
  Pause,
  RotateCcw,
  Trophy,
  X,
  Timer,
  SkipForward,
} from "lucide-react";

/* -------------------- TYPES -------------------- */

type WorkoutItem = {
  title: string;
  subtitle: string;
  durationMin: number;
  items: Array<{ name: string; setsReps: string }>;
};

type PlanOk = { ok: true; workout: WorkoutItem };
type PlanFail = { ok: false; message: string };
type PlanResponse = PlanOk | PlanFail;

type ViewState =
  | { status: "boot" }
  | { status: "noauth" }
  | { status: "error"; message: string }
  | { status: "ready"; data: PlanOk };

/* -------------------- LOADER -------------------- */

async function loadWorkoutAction(
  _prev: ViewState,
  payload: { email: string | null }
): Promise<ViewState> {
  const email = (payload.email ?? "").trim();
  if (!email) return { status: "noauth" };

  try {
    const res = await fetch(`/api/plan?email=${encodeURIComponent(email)}`);
    const text = await res.text();

    let json: PlanResponse;
    try {
      json = text
        ? (JSON.parse(text) as PlanResponse)
        : ({ ok: false, message: "Empty response" } as PlanFail);
    } catch {
      json = { ok: false, message: "Invalid server response" };
    }

    if (!res.ok || !json.ok) {
      const msg = "message" in json ? json.message : "Failed to load workout.";
      return { status: "error", message: msg };
    }

    return { status: "ready", data: json };
  } catch {
    return { status: "error", message: "Failed to load workout." };
  }
}

/* -------------------- UI -------------------- */

function TopBar() {
  return (
    <div className="sticky top-0 z-20 border-b border-slate-100 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-emerald-600 text-white">
            <span className="text-sm font-bold">◎</span>
          </div>
          <span className="text-lg font-semibold text-slate-900">
            RoutineForge
          </span>
        </div>

        <Link
          href="/dashboard"
          className="text-sm text-slate-600 hover:text-slate-900"
        >
          ← Back to Dashboard
        </Link>
      </div>
    </div>
  );
}

function WorkoutHeaderCard({ workout }: { workout: WorkoutItem }) {
  return (
    <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-emerald-100 p-6 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-emerald-700">
            🏋️ {workout.title}
          </p>
          <p className="mt-1 text-sm text-emerald-800/80">{workout.subtitle}</p>
        </div>

        <div className="inline-flex w-fit items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white">
          <Timer size={14} /> {workout.durationMin} min
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatChip label="Warm-up" value="5 min" />
        <StatChip
          label="Workout"
          value={`${Math.max(10, workout.durationMin - 10)} min`}
        />
        <StatChip label="Cool-down" value="5 min" />
      </div>
    </div>
  );
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/70 px-4 py-3">
      <p className="text-xs font-semibold text-slate-900">{label}</p>
      <p className="mt-1 text-sm text-slate-700">{value}</p>
    </div>
  );
}

function SectionTitle({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="mt-2">
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <p className="mt-1 text-xs text-slate-600">{desc}</p>
    </div>
  );
}

/* -------------------- TIMER HELPERS -------------------- */

function parseMinutes(label: string): number | null {
  const m = /(\d+)\s*min/i.exec(label);
  if (!m?.[1]) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function fmtMMSS(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

type TimerState = {
  runningKey: string | null;
  remainingSec: number;
  durationSec: number;
  paused: boolean;
};

type RowDef = {
  key: string;
  name: string;
  label: string;
  minutes: number | null;
};

function ExerciseRow({
  name,
  label,
  timerText,
  timerEnabled,
  onOpenTimer,
}: {
  name: string;
  label: string;
  timerText: string;
  timerEnabled: boolean;
  onOpenTimer: () => void;
}) {
  return (
    <div className="group flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 grid h-9 w-9 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
          ✅
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">{name}</p>
          <p className="text-xs text-slate-500">Form first, then speed</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 group-hover:bg-emerald-50 group-hover:text-emerald-700">
          {label}
        </div>

        <button
          type="button"
          onClick={onOpenTimer}
          disabled={!timerEnabled}
          className={[
            "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold",
            timerEnabled
              ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              : "border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed",
          ].join(" ")}
          aria-label="Open timer"
          title={timerEnabled ? "Open timer" : "No timer for sets/reps"}
        >
          <Timer size={14} />
          {timerText}
        </button>
      </div>
    </div>
  );
}

/* -------------------- CONFETTI + MODALS -------------------- */

type ConfettiPiece = {
  left: number;
  delay: number;
  duration: number;
  size: number;
  color: string;
};

function Confetti({ active }: { active: boolean }) {
  const pieces = useMemo<ConfettiPiece[]>(() => {
    if (!active) return [];
    const colors = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444"];
    const out: ConfettiPiece[] = [];
    for (let i = 0; i < 120; i++) {
      out.push({
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        duration: 1.8 + Math.random() * 1.4,
        size: 6 + Math.random() * 10,
        color: colors[i % colors.length]!,
      });
    }
    return out;
  }, [active]);

  if (!active) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[90] overflow-hidden">
      {/* keyframes live here (NOT styled-jsx) */}
      <style>{`
        @keyframes rfConfettiFall {
          0% { transform: translateY(-10px) rotate(0deg); opacity: 0; }
          10% { opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 1; }
        }
      `}</style>

      {pieces.map((p, idx) => (
        <span
          key={idx}
          style={{
            left: `${p.left}%`,
            width: `${p.size}px`,
            height: `${p.size * 0.55}px`,
            background: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            animationName: "rfConfettiFall",
            animationTimingFunction: "linear",
            animationIterationCount: 1 as any,
          }}
          className="absolute top-0 block rounded-sm"
        />
      ))}
    </div>
  );
}

function WorkoutCompleteModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-950/60 px-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xl">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-50 text-emerald-700">
          <Trophy size={26} />
        </div>
        <h2 className="mt-4 text-2xl font-semibold text-slate-900">
          Workout Complete!
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Great job! Keep up the hard work.
        </p>

        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

function TimerOverlay({
  open,
  title,
  remainingSec,
  durationSec,
  paused,
  onClose,
  onTogglePause,
  onRestart,
  onSkip,
}: {
  open: boolean;
  title: string;
  remainingSec: number;
  durationSec: number;
  paused: boolean;
  onClose: () => void;
  onTogglePause: () => void;
  onRestart: () => void;
  onSkip: () => void;
}) {
  if (!open) return null;

  const pct =
    durationSec > 0 ? Math.max(0, Math.min(1, remainingSec / durationSec)) : 0;

  const size = 240;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = c * pct;

  return (
    <div className="fixed inset-0 z-[85] bg-slate-950/70">
      <div className="absolute left-1/2 top-1/2 w-full max-w-xl -translate-x-1/2 -translate-y-1/2 px-6">
        <div className="relative rounded-3xl bg-slate-900/80 p-10 text-white shadow-2xl">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-xl hover:bg-white/10"
            aria-label="Close timer"
            title="Close"
          >
            <X size={18} />
          </button>

          <div className="text-center">
            <p className="text-sm text-white/70">Rest Timer</p>
            <p className="mt-1 text-2xl font-semibold">{title}</p>
          </div>

          <div className="mt-8 grid place-items-center">
            <div className="relative grid place-items-center">
              <svg width={size} height={size}>
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  stroke="rgba(255,255,255,0.10)"
                  strokeWidth={stroke}
                  fill="transparent"
                />
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  stroke="rgba(16,185,129,1)"
                  strokeWidth={stroke}
                  fill="transparent"
                  strokeLinecap="round"
                  strokeDasharray={`${dash} ${c - dash}`}
                  transform={`rotate(-90 ${size / 2} ${size / 2})`}
                />
              </svg>

              <div className="absolute text-center">
                <div className="text-6xl font-semibold tabular-nums">
                  {fmtMMSS(remainingSec)}
                </div>
                <div className="mt-1 text-sm text-white/70">
                  {paused ? "Paused" : "Resting"}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={onTogglePause}
              className="grid h-14 w-14 place-items-center rounded-full bg-white/10 hover:bg-white/15 active:scale-[0.99]"
              aria-label={paused ? "Resume" : "Pause"}
              title={paused ? "Resume" : "Pause"}
            >
              {paused ? <Play size={20} /> : <Pause size={20} />}
            </button>

            <button
              type="button"
              onClick={onSkip}
              className="grid h-14 w-14 place-items-center rounded-full bg-emerald-500 hover:bg-emerald-600 active:scale-[0.99]"
              aria-label="Skip"
              title="Skip"
            >
              <SkipForward size={20} />
            </button>

            <button
              type="button"
              onClick={onRestart}
              className="grid h-14 w-14 place-items-center rounded-full bg-white/10 hover:bg-white/15 active:scale-[0.99]"
              aria-label="Restart"
              title="Restart"
            >
              <RotateCcw size={20} />
            </button>
          </div>

          <div className="mt-6 text-center text-xs text-white/60">
            Tip: use rest timer between sets or timed drills.
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------- MAIN -------------------- */

export default function WorkoutClient() {
  const [view, runLoad] = useActionState(loadWorkoutAction, {
    status: "boot",
  } as ViewState);

  const [timer, setTimer] = useState<TimerState>({
    runningKey: null,
    remainingSec: 0,
    durationSec: 0,
    paused: false,
  });

  const [timerOpen, setTimerOpen] = useState(false);
  const [timerTitle, setTimerTitle] = useState("Rest");

  const [completeOpen, setCompleteOpen] = useState(false);
  const [confettiOn, setConfettiOn] = useState(false);

  useEffect(() => {
    const email = localStorage.getItem("rf_email");
    startTransition(() => {
      runLoad({ email });
    });
  }, [runLoad]);

  // Tick while timer overlay is open and running
  useEffect(() => {
    if (!timerOpen) return;
    if (timer.paused) return;
    if (!timer.runningKey) return;
    if (timer.remainingSec <= 0) return;

    const id = window.setInterval(() => {
      setTimer((p) => {
        if (!p.runningKey || p.paused) return p;
        const next = p.remainingSec - 1;
        if (next <= 0) return { ...p, runningKey: null, remainingSec: 0 };
        return { ...p, remainingSec: next };
      });
    }, 1000);

    return () => window.clearInterval(id);
  }, [timerOpen, timer.paused, timer.runningKey, timer.remainingSec]);

  const rows: RowDef[] = useMemo(() => {
    if (view.status !== "ready") return [];

    const warm: RowDef[] = [
      { key: "wu-1", name: "Light jogging in place", label: "5 min", minutes: 5 },
      { key: "wu-2", name: "Shoulder + hip mobility", label: "2 min", minutes: 2 },
    ];

    const main: RowDef[] = view.data.workout.items.map((x) => ({
      key: `mw-${x.name}`,
      name: x.name,
      label: x.setsReps,
      minutes: parseMinutes(x.setsReps), // usually null for sets/reps
    }));

    const cool: RowDef[] = [
      { key: "cd-1", name: "Stretch (hamstrings, chest, back)", label: "5 min", minutes: 5 },
    ];

    return [...warm, ...main, ...cool];
  }, [view]);

  function defaultSecondsForRow(row: RowDef): number {
    if (!row.minutes) return 0;
    return Math.max(1, Math.floor(row.minutes * 60));
  }

  function getTimerText(row: RowDef): string {
    if (!row.minutes) return "—";
    if (timerOpen && timer.runningKey === row.key) return fmtMMSS(timer.remainingSec);
    return fmtMMSS(defaultSecondsForRow(row));
  }

  function openTimerForRow(row: RowDef) {
    if (!row.minutes) return;

    const durationSec = defaultSecondsForRow(row);

    setTimerTitle(row.name);
    setTimer({
      runningKey: row.key,
      durationSec,
      remainingSec: durationSec,
      paused: false,
    });
    setTimerOpen(true);
  }

  function togglePause() {
    setTimer((p) => ({ ...p, paused: !p.paused }));
  }

  function restartTimer() {
    if (!timer.runningKey) return;
    const row = rows.find((r) => r.key === timer.runningKey) ?? null;
    if (!row) return;

    const durationSec = defaultSecondsForRow(row);
    setTimer((p) => ({
      ...p,
      durationSec,
      remainingSec: durationSec,
      paused: false,
    }));
  }

  function skipTimer() {
    setTimer((p) => ({ ...p, runningKey: null, remainingSec: 0, paused: false }));
    setTimerOpen(false);
  }

  function closeTimer() {
    setTimerOpen(false);
    setTimer((p) => ({ ...p, paused: true }));
  }

  function finishWorkout() {
    setCompleteOpen(true);
    setConfettiOn(true);
    window.setTimeout(() => setConfettiOn(false), 2200);
  }

  function closeComplete() {
    setCompleteOpen(false);
  }

  return (
    <main className="min-h-screen bg-white">
      <TopBar />

      <div className="mx-auto max-w-6xl px-6 py-10">
        {view.status === "boot" ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-slate-700">
            Loading workout…
          </div>
        ) : view.status === "noauth" ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
            No login found. Please log in again.{" "}
            <Link href="/login" className="font-semibold underline underline-offset-2">
              Go to login
            </Link>
          </div>
        ) : view.status === "error" ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
            {view.message}
          </div>
        ) : (
          <>
            <div className="text-center">
              <h1 className="text-4xl font-semibold tracking-tight text-slate-900">
                Today&apos;s Workout
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                Personalized workout based on your goal, experience, and available time
              </p>
            </div>

            <div className="mt-10">
              <WorkoutHeaderCard workout={view.data.workout} />
            </div>

            <div className="mt-8 grid grid-cols-1 gap-4">
              <SectionTitle title="Warm-up" desc="Get your body ready (5 minutes)" />
              {rows.slice(0, 2).map((r) => (
                <ExerciseRow
                  key={r.key}
                  name={r.name}
                  label={r.label}
                  timerText={getTimerText(r)}
                  timerEnabled={r.minutes !== null}
                  onOpenTimer={() => openTimerForRow(r)}
                />
              ))}

              <SectionTitle title="Main workout" desc="Follow the sets & reps below" />
              {rows.slice(2, rows.length - 1).map((r) => (
                <ExerciseRow
                  key={r.key}
                  name={r.name}
                  label={r.label}
                  timerText={getTimerText(r)}
                  timerEnabled={r.minutes !== null}
                  onOpenTimer={() => openTimerForRow(r)}
                />
              ))}

              <SectionTitle title="Cool-down" desc="Bring your heart rate down (5 minutes)" />
              {rows.slice(rows.length - 1).map((r) => (
                <ExerciseRow
                  key={r.key}
                  name={r.name}
                  label={r.label}
                  timerText={getTimerText(r)}
                  timerEnabled={r.minutes !== null}
                  onOpenTimer={() => openTimerForRow(r)}
                />
              ))}

              <button
                type="button"
                onClick={finishWorkout}
                className="mt-4 w-full rounded-xl bg-emerald-600 px-5 py-4 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Finish Workout
              </button>
            </div>

            <div className="mt-10 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-emerald-100 px-6 py-8 text-center">
              <p className="text-sm font-semibold text-slate-900">Tip</p>
              <p className="mt-2 text-sm text-slate-600">
                Track completion in Log Today to build your streak. Consistency is the goal.
              </p>
              <Link
                href="/tracker"
                className="mt-5 inline-flex items-center justify-center rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Log Today&apos;s Workout
              </Link>
            </div>

            <div className="fixed bottom-6 right-6 grid h-10 w-10 place-items-center rounded-full bg-slate-900 text-white shadow-lg">
              ?
            </div>

            {/* ✅ Celebration overlay + modal */}
            <Confetti active={confettiOn} />
            <WorkoutCompleteModal open={completeOpen} onClose={closeComplete} />

            {/* ✅ Fullscreen timer overlay */}
            <TimerOverlay
              open={timerOpen}
              title={timerTitle}
              remainingSec={timer.remainingSec}
              durationSec={timer.durationSec}
              paused={timer.paused}
              onClose={closeTimer}
              onTogglePause={togglePause}
              onRestart={restartTimer}
              onSkip={skipTimer}
            />
          </>
        )}
      </div>
    </main>
  );
}
