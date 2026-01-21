import mongoose, { Schema, model, models } from "mongoose";

export type UserDoc = {
  fullName: string;
  email: string;
  passwordHash: string;

  // ✅ Used to decide onboarding redirect
  onboardingCompleted: boolean;

  // ✅ Required for reset password
  resetPasswordToken?: string;
  resetPasswordExpiresAt?: Date;

  createdAt: Date;
  updatedAt: Date;
};

const UserSchema = new Schema<UserDoc>(
  {
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },

    // ✅ NEW: onboarding completion flag
    onboardingCompleted: { type: Boolean, default: false },

    // ✅ Reset password fields
    resetPasswordToken: { type: String },
    resetPasswordExpiresAt: { type: Date },
  },
  { timestamps: true }
);

export const User =
  (models.User as mongoose.Model<UserDoc>) || model<UserDoc>("User", UserSchema);
