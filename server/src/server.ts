import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { registerHandlers } from './socket/handlers';
import { cleanupStaleRooms } from './rooms/roomManager';

dotenv.config();

const PORT = process.env.PORT || 3001;

// Support comma-separated list of allowed origins.
// Always allows all *.crazygames.com subdomains for the CrazyGames platform.
const rawOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true; // same-origin / non-browser requests
  if (rawOrigins.includes(origin)) return true;
  if (/^https?:\/\/([a-z0-9-]+\.)*crazygames\.com$/.test(origin)) return true;
  return false;
}

const corsOriginFn = (
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void
) => {
  if (isAllowedOrigin(origin)) callback(null, true);
  else callback(new Error(`CORS: origin ${origin} not allowed`));
};

const app = express();
app.use(cors({ origin: corsOriginFn }));
app.use(express.json());

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: { origin: corsOriginFn, methods: ['GET', 'POST'] },
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
