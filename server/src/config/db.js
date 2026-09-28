import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/personal-trading-dashboard';
    await mongoose.connect(mongoUri);
    console.log('MongoDB connected');
    return true;
  } catch (error) {
    console.warn('MongoDB connection failed, continuing in local demo mode:', error.message);
    return false;
  }
};

export const isMongoConnected = () => mongoose.connection.readyState === 1;

export default connectDB;
