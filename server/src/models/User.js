import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    isEmailVerified: { type: Boolean, default: true },
    emailVerificationCodeHash: { type: String, default: '' },
    emailVerificationExpiresAt: { type: Date, default: null },
    emailVerificationSentAt: { type: Date, default: null },
    emailVerificationAttempts: { type: Number, default: 0 },
    passwordResetCodeHash: { type: String, default: '' },
    passwordResetExpiresAt: { type: Date, default: null },
    passwordResetSentAt: { type: Date, default: null },
    passwordResetAttempts: { type: Number, default: 0 },
    profile: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
    demoDataSeeded: { type: Boolean, default: false },
    isDemo: { type: Boolean, default: false },
    expiresAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export default mongoose.model("User", userSchema);
