import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import shareRoutes from './routes/shareRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import communityRoutes from './routes/communityRoutes.js';
import { purgeExpiredDemoAccounts } from './controllers/authController.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim().replace(/\/+$/, ''))
  .filter(Boolean);
const androidAssetOrigin = 'https://appassets.androidplatform.net';

const startRenderKeepAlive = () => {
  const serviceUrl = process.env.RENDER_EXTERNAL_URL;
  if (!serviceUrl) return;

  const schedulePing = () => {
    const delay = (10 + Math.random() * 5) * 60 * 1000;
    setTimeout(async () => {
      try {
        const response = await fetch(`${serviceUrl}/api/health`);
        if (!response.ok) {
          console.warn(`Render keep-alive request returned ${response.status}`);
        }
      } catch (error) {
        console.warn('Render keep-alive request failed:', error.message);
      }

      schedulePing();
    }, delay).unref();
  };

  schedulePing();
};

app.use(cors({
  exposedHeaders: ['X-Auth-Token'],
  origin(origin, callback) {
    if (!origin || origin === androidAssetOrigin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error('Origin is not allowed by CORS'));
  },
}));
app.use(express.json({ limit: '2mb' }));

app.get('/', (req, res) => {
  res.send('Trading dashboard server is running.');
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Trading dashboard API is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/shares', shareRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/community', communityRoutes);

const startServer = async () => {
  if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET must be set in production');
  }

  await connectDB();
  await purgeExpiredDemoAccounts();
  startRenderKeepAlive();
  setInterval(() => {
    purgeExpiredDemoAccounts().catch((error) => console.error('Demo account cleanup failed:', error.message));
  }, 60 * 1000).unref();

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer().catch((error) => {
  console.error('Server failed to start:', error.message);
  process.exit(1);
});
