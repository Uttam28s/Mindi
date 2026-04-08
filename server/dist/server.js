"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const handlers_1 = require("./socket/handlers");
const roomManager_1 = require("./rooms/roomManager");
dotenv_1.default.config();
const PORT = process.env.PORT || 3001;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const app = (0, express_1.default)();
app.use((0, cors_1.default)({ origin: CLIENT_ORIGIN }));
app.use(express_1.default.json());
const httpServer = http_1.default.createServer(app);
const io = new socket_io_1.Server(httpServer, {
    cors: { origin: CLIENT_ORIGIN, methods: ['GET', 'POST'] },
    transports: ['websocket', 'polling']
});
// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok', rooms: 0 }));
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
