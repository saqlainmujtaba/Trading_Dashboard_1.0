import mongoose from 'mongoose';

const plannedAccountSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    company: { type: String, required: true },
    size: { type: Number, default: 0 },
    type: { type: String, default: 'Instant' },
    purchaseDate: { type: String, default: '' },
    cost: { type: Number, default: 0 },
    priority: { type: String, default: 'Medium' },
    notes: { type: String, default: '' },
    status: { type: String, default: 'Planned' },
  },
  { timestamps: true }
);

export default mongoose.model('PlannedAccount', plannedAccountSchema);
