import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { config } from './config';
import { WebSocketService } from './services/WebSocketService';
import profileRoutes from './routes/profileRoutes';
import { createJobSearchRoutes } from './routes/jobSearchRoutes';
import internshalaRoutes from './routes/internshalaRoutes';

const app = express();
const httpServer = createServer(app);

// Initialize WebSocket service
const wsService = new WebSocketService(httpServer);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/profile', profileRoutes);
app.use('/api/job-search', createJobSearchRoutes(wsService));
app.use('/api/internshala', internshalaRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Root endpoint
app.get('/', (req, res) => {
  res.send('Intelligent Job Agent Backend 🚀');
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

httpServer.listen(config.port, () => {
  console.log(`🚀 Server running on http://localhost:${config.port}`);
  console.log(`🔌 WebSocket server ready`);
  console.log(`Environment: ${config.nodeEnv}`);
});