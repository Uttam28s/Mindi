/**
 * Singleton Socket.io client for the online multiplayer mode.
 * Only connects when the player enters online mode (create/join game).
 */
import { io, Socket } from 'socket.io-client';

// In dev the Vite proxy forwards /socket.io → localhost:3001 (same origin).
// In prod set VITE_SERVER_URL to the deployed server URL.
const SERVER_URL = (import.meta.env.VITE_SERVER_URL as string | undefined) || window.location.origin;

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SERVER_URL, {
      transports: ['polling', 'websocket'],
      autoConnect: false
    });
  }
  return socket;
}

export function connectSocket(): Socket {
  const s = getSocket();
  if (!s.connected) s.connect();
  return s;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}

export function isConnected(): boolean {
  return socket?.connected ?? false;
}
