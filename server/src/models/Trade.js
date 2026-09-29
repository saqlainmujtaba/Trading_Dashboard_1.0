import mongoose from 'mongoose';

const tradeSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    account: { type: String, required: true },
    propFirm: { type: String, default: '' },
    pair: { type: String, required: true },
    buySell: { type: String, required: true },
    entryPrice: { type: Number, default: 0 },
    exitPrice: { type: Number, default: 0 },
    lotSize: { type: Number, default: 0 },
    risk: { type: Number, default: 0 },
    pnl: { type: Number, default: 0 },
    rr: { type: String, default: '' },
    rrMode: { type: String, enum: ['auto', 'manual'], default: 'auto' },
    reason: { type: String, default: '' },
    screenshot: { type: String, default: 'Attached' },
    notes: { type: String, default: '' },
    externalId: { type: String, default: '' },
    date: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.model('Trade', tradeSchema);
