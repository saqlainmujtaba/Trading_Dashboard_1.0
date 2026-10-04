import mongoose from 'mongoose';

const shareSchema = new mongoose.Schema(
  {
    ownerId: { type: String, required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    type: { type: String, required: true },
    title: { type: String, required: true, maxlength: 120 },
    description: { type: String, default: '', maxlength: 300 },
    snapshot: { type: mongoose.Schema.Types.Mixed, required: true },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model('Share', shareSchema);
