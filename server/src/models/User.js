import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    profile: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
    demoDataSeeded: { type: Boolean, default: false },
    isDemo: { type: Boolean, default: false },
    expiresAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export default mongoose.model("User", userSchema);
