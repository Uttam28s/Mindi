"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const https_1 = __importDefault(require("https"));
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const handlers_1 = require("./socket/handlers");
const roomManager_1 = require("./rooms/roomManager");
dotenv_1.default.config();
const PORT = process.env.PORT || 3001;
// Support comma-separated list of allowed origins.
// Always allows all *.crazygames.com subdomains for the CrazyGames platform.
const rawOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
function isAllowedOrigin(origin) {
    if (!origin)
        return true; // same-origin / non-browser requests
    if (rawOrigins.includes(origin))
        return true;
    if (/^https?:\/\/([a-z0-9-]+\.)*crazygames\.com$/.test(origin))
        return true;
    if (/^http:\/\/localhost(:\d+)?$/.test(origin))
        return true;
    if (/^http:\/\/127\.0\.0\.1(:\d+)?$/.test(origin))
        return true;
    return false;
}
const corsOriginFn = (origin, callback) => {
    if (isAllowedOrigin(origin))
        callback(null, true);
    else
        callback(new Error(`CORS: origin ${origin} not allowed`));
};
const app = (0, express_1.default)();
app.use((0, cors_1.default)({ origin: corsOriginFn }));
app.use(express_1.default.json());
const httpServer = http_1.default.createServer(app);
const io = new socket_io_1.Server(httpServer, {
    cors: { origin: corsOriginFn, methods: ['GET', 'POST'] },
    transports: ['websocket', 'polling']
});
// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok', rooms: 0 }));
// Self-ping to prevent Render free tier from spinning down.
// Uses https when SERVER_URL starts with https:// to avoid ERR_INVALID_PROTOCOL.
if (process.env.SERVER_URL) {
    setInterval(() => {
        try {
            const serverUrl = process.env.SERVER_URL;
            const healthUrl = `${serverUrl}/health`;
            const requester = healthUrl.startsWith('https://') ? https_1.default : http_1.default;
            requester.get(healthUrl, (res) => {
                res.resume(); // discard response body
            }).on('error', (err) => {
                console.warn('[keepalive] ping failed:', err.message);
            });
        }
        catch (err) {
            console.warn('[keepalive] unexpected error:', err);
        }
    }, 10 * 60 * 1000); // every 10 minutes
}
// Socket.io
io.on('connection', socket => {
    console.log(`[socket] connected: ${socket.id}`);
    (0, handlers_1.registerHandlers)(io, socket);
});
// Clean up stale lobby rooms every 5 minutes
setInterval(roomManager_1.cleanupStaleRooms, 5 * 60 * 1000);
httpServer.listen(PORT, () => {
    console.log(`Mindi server running on http://localhost:${PORT}`);
});
