import mongoose from 'mongoose';

const payoutSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    account: { type: String, required: true },
    date: { type: String, required: true },
    amount: { type: Number, required: true },
    method: { type: String, default: 'Bank Transfer' },
    status: { type: String, default: 'Pending' },
  },
  { timestamps: true }
);

export default mongoose.model('Payout', payoutSchema);
