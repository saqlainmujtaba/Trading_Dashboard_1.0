import mongoose from 'mongoose';

const accountSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    propFirm: { type: String, default: 'FundedSquad' },
    type: { type: String, default: 'Instant' },
    fundedAmount: { type: Number, default: 0 },
    balance: { type: Number, default: 0 },
    startingBalance: { type: Number, default: 0 },
    forexLeverage: { type: Number, default: 0, min: 0 },
    indicesLeverage: { type: Number, default: 0, min: 0 },
    commoditiesLeverage: { type: Number, default: 0, min: 0 },
    cryptoLeverage: { type: Number, default: 0, min: 0 },
    profitPercent: { type: Number, default: 0 },
    maxDailyLoss: { type: Number, default: 0 },
    maxOverallLoss: { type: Number, default: 0 },
    profitTarget: { type: Number, default: 0 },
    nextPayoutDate: { type: String, default: '' },
    payoutReceived: { type: Number, default: 0 },
    status: { type: String, default: 'Active' },
    purchaseDate: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model('Account', accountSchema);
