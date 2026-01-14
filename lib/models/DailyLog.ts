import mongoose, { Schema, model, models } from "mongoose";

export type DailyLogDoc = {
  userEmail: string;
  date: string; // YYYY-MM-DD
  weightKg: number | null;
  waterLiters: number | null;
  sleepHours: number | null;
  steps: number | null;
  workoutDone: boolean;
  mealsFollowedPct: number; // 0..100
  mood: 1 | 2 | 3 | 4 | 5;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
};

const DailyLogSchema = new Schema<DailyLogDoc>(
  {
    userEmail: { type: String, required: true, index: true },
    date: { type: String, required: true, index: true },

    weightKg: { type: Number, default: null },
    waterLiters: { type: Number, default: null },
    sleepHours: { type: Number, default: null },
    steps: { type: Number, default: null },

    workoutDone: { type: Boolean, default: false },
    mealsFollowedPct: { type: Number, default: 0 },
    mood: { type: Number, default: 3 },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

// unique per day per user
DailyLogSchema.index({ userEmail: 1, date: 1 }, { unique: true });

export const DailyLog =
  (models.DailyLog as mongoose.Model<DailyLogDoc>) ||
  model<DailyLogDoc>("DailyLog", DailyLogSchema);
