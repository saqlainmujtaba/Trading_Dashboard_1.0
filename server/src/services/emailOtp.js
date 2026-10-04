import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import mongoose from 'mongoose';
import EmailOtp from '../models/EmailOtp.js';

const OTP_LIFETIME_MS = 10 * 60 * 1000;
const inMemoryOtps = new Map();

const otpKey = (email, purpose) => `${purpose}:${email}`;

export const createOtp = () => String(randomInt(0, 1_000_000)).padStart(6, '0');

export const hashOtp = (otp) => createHmac(
  'sha256',
  process.env.OTP_SECRET || process.env.JWT_SECRET || 'dev-secret'
).update(otp).digest('hex');

export const otpMatches = (record, otp) => {
  const expected = Buffer.from(record.otpHash, 'hex');
  const actual = Buffer.from(hashOtp(otp), 'hex');
  return expected.length === actual.length && timingSafeEqual(expected, actual);
};

export const findOtp = async (email, purpose) => {
  if (mongoose.connection.readyState === 1) {
    return EmailOtp.findOne({ email, purpose }).lean();
  }

  return inMemoryOtps.get(otpKey(email, purpose)) || null;
};

export const saveOtp = async (record) => {
  if (mongoose.connection.readyState === 1) {
    const fields = Object.fromEntries(
      Object.entries(record).filter(([key]) => !['_id', 'createdAt', 'updatedAt', '__v'].includes(key))
    );
    return EmailOtp.findOneAndUpdate(
      { email: record.email, purpose: record.purpose },
      { $set: fields },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  inMemoryOtps.set(otpKey(record.email, record.purpose), record);
  return record;
};

export const deleteOtp = async (email, purpose) => {
  if (mongoose.connection.readyState === 1) {
    await EmailOtp.deleteOne({ email, purpose });
    return;
  }

  inMemoryOtps.delete(otpKey(email, purpose));
};

export const newOtpRecord = ({ email, purpose, otp, name, passwordHash }) => {
  const now = new Date();
  return {
    email,
    purpose,
    otpHash: hashOtp(otp),
    ...(name ? { name } : {}),
    ...(passwordHash ? { passwordHash } : {}),
    attempts: 0,
    sentAt: now,
    expiresAt: new Date(now.getTime() + OTP_LIFETIME_MS),
  };
};
