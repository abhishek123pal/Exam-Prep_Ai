import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import aiRoutes from './routes/ai.routes';
import adminRoutes from './routes/admin.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// =====================
// Middleware
// =====================
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =====================
// API Routes
// =====================

// AI Module
app.use('/api/ai', aiRoutes);

// ✅ Admin Module (THIS WAS MISSING)
app.use('/api/admin', adminRoutes);

// =====================
// Health Check
// =====================
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'HEALTHY',
    timestamp: new Date()
  });
});

// =====================
// Global Error Handler
// =====================
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error('💥 [GLOBAL EXCEPTION]:', err);

    res.status(500).json({
      success: false,
      error: err.message || 'Internal Server Error'
    });
  }
);

// =====================
// Start Server
// =====================
app.listen(PORT, () => {
  console.log(`🚀 [BACKEND ENGINE]: Running on http://localhost:${PORT}`);
});

// import express from 'express';
// import cors from 'cors';
// import dotenv from 'dotenv';
// import aiRoutes from './routes/ai.routes';
// import adminRoutes from './routes/admin.routes';

// dotenv.config();

// const app = express();
// const PORT = process.env.PORT || 5000;

// // 🛡️ CORS Configuration: Allow Next.js frontend to access streaming
// app.use(cors({
//   origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
//   methods: ['GET', 'POST', 'OPTIONS'],
//   allowedHeaders: ['Content-Type', 'Authorization'],
//   credentials: true
// }));

// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// // Core API Router
// app.use('/api/ai', aiRoutes);

// // Health check for Deployment (Render/Railway)
// app.get('/health', (req, res) => {
//   res.status(200).json({ status: 'HEALTHY', timestamp: new Date() });
// });

// // Global Error Handler
// app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
//   console.error('💥 [GLOBAL EXCEPTION]:', err.message);
//   res.status(500).json({ error: 'Internal Server Error' });
// });

// app.listen(PORT, () => {
//   console.log(`🚀 [BACKEND ENGINE]: Running on http://localhost:${PORT}`);
// });