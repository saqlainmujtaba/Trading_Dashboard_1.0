import mongoose from 'mongoose';
import User from '../models/User.js';

const requireAdmin = async (req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: 'Admin tools require the database connection.' });
    }
    const user = await User.findById(req.user.id).select('_id role');
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required.' });
    }
    req.adminUser = user;
    return next();
  } catch (error) {
    return res.status(500).json({ message: 'Could not verify admin access.' });
  }
};

export default requireAdmin;
