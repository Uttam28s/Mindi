import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { registerHandlers } from './socket/handlers';
import { cleanupStaleRooms } from './rooms/roomManager';

dotenv.config();

const PORT = process.env.PORT || 3001;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

const app = express();
app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: { origin: CLIENT_ORIGIN, methods: ['GET', 'POST'] },
  transports: ['websocket', 'polling']
});

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok', rooms: 0 }));

// Self-ping to prevent Render free tier from spinning down
if (process.env.SERVER_URL) {
  setInterval(() => {
    http.get(`${process.env.SERVER_URL}/health`, (res) => {
      res.resume(); // discard response body
    }).on('error', (err) => {
      console.warn('[keepalive] ping failed:', err.message);
    });
  }, 10 * 60 * 1000); // every 10 minutes
}

// Socket.io
io.on('connection', socket => {
  console.log(`[socket] connected: ${socket.id}`);
  registerHandlers(io, socket);
});

// Clean up stale lobby rooms every 5 minutes
setInterval(cleanupStaleRooms, 5 * 60 * 1000);

httpServer.listen(PORT, () => {
  console.log(`Mindi server running on http://localhost:${PORT}`);
});
