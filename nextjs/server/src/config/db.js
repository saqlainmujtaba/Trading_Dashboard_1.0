import mongoose from 'mongoose';

let connectionPromise;

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) return true;

  if (!connectionPromise) {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/personal-trading-dashboard';
    connectionPromise = mongoose.connect(mongoUri)
      .then(() => {
        console.log('MongoDB connected');
        return true;
      })
      .catch((error) => {
        if (process.env.NODE_ENV === 'production') throw error;

        console.warn('MongoDB connection failed, continuing in local demo mode:', error.message);
        return false;
      })
      .finally(() => {
        if (mongoose.connection.readyState !== 1) connectionPromise = undefined;
      });
  }

  return connectionPromise;
};

export const isMongoConnected = () => mongoose.connection.readyState === 1;

export default connectDB;
