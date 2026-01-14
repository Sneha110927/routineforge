import mongoose, { Schema, model, models } from "mongoose";

export type UserDoc = {
  fullName: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
};

const UserSchema = new Schema<UserDoc>(
  {
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
  },
  { timestamps: true }
);

export const User =
  (models.User as mongoose.Model<UserDoc>) || model<UserDoc>("User", UserSchema);
