import mongoose, { Schema, model, models } from "mongoose";

type DietPref = "veg" | "nonveg" | "eggetarian" | "vegan";
type Goal = "muscle_gain" | "weight_gain" | "fat_loss" | "maintenance";
type Activity = "low" | "medium" | "high";
type Experience = "beginner" | "intermediate" | "advanced";
type Location = "home" | "gym";
type Gender = "" | "male" | "female" | "other" | "prefer_not";
type MealsPerDay = "3" | "4" | "5";

export type ProfileDoc = {
  userEmail: string;

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

  // ✅ Settings preferences (new)
  prefDarkMode: boolean;
  prefDailyReminder: boolean;
  prefWorkoutReminder: boolean;
  prefMealReminder: boolean;

  createdAt: Date;
  updatedAt: Date;
};

const ProfileSchema = new Schema<ProfileDoc>(
  {
    userEmail: { type: String, required: true, index: true, unique: true },

    heightCm: { type: String, required: true },
    weightKg: { type: String, required: true },
    age: { type: String, required: true },
    gender: { type: String, default: "" },

    profession: { type: String, required: true },
    workStart: { type: String, required: true },
    workEnd: { type: String, required: true },
    activityLevel: { type: String, required: true },

    dietPreference: { type: String, required: true },
    allergies: { type: String, default: "" },
    mealsPerDay: { type: String, required: true },

    goal: { type: String, required: true },
    experience: { type: String, required: true },
    workoutLocation: { type: String, required: true },
    workoutMinutesPerDay: { type: String, required: true },

    // ✅ Settings preferences fields
    prefDarkMode: { type: Boolean, default: false },
    prefDailyReminder: { type: Boolean, default: true },
    prefWorkoutReminder: { type: Boolean, default: true },
    prefMealReminder: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Profile =
  (models.Profile as mongoose.Model<ProfileDoc>) ||
  model<ProfileDoc>("Profile", ProfileSchema);
