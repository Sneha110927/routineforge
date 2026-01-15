import mongoose, { Schema, model, models } from "mongoose";

export type UserDoc = {
  fullName: string;
  email: string;
  passwordHash: string;

  // ✅ REQUIRED for reset password
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

    // ✅ ADD THESE
    resetPasswordToken: { type: String },
    resetPasswordExpiresAt: { type: Date },
  },
  { timestamps: true }
);

export const User =
  (models.User as mongoose.Model<UserDoc>) ||
  model<UserDoc>("User", UserSchema);
