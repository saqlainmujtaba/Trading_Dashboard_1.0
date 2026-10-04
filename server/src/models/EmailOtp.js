import mongoose from 'mongoose';

const emailOtpSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, trim: true },
  purpose: { type: String, required: true, enum: ['verify-email', 'reset-password'] },
  otpHash: { type: String, required: true },
  name: { type: String },
  passwordHash: { type: String },
  attempts: { type: Number, default: 0 },
  sentAt: { type: Date, required: true },
  expiresAt: { type: Date, required: true, expires: 0 },
}, { timestamps: true });

emailOtpSchema.index({ email: 1, purpose: 1 }, { unique: true });

export default mongoose.model('EmailOtp', emailOtpSchema);
