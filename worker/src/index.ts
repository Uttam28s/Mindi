/**
 * Cloudflare Worker entry point.
 *
 * Routing model: every room code maps to exactly one Durable Object instance
 * via idFromName(roomCode). The DO *is* the room, which replaces the old
 * `rooms = new Map()` registry that lived in the Render server's process memory.
 */

export { MindiRoom } from './room';

export interface Env {
  MINDI_ROOM: DurableObjectNamespace;
  CLIENT_ORIGIN?: string;
}

/**
 * Allows the configured origins plus localhost for development.
 */
function isAllowedOrigin(origin: string | null, env: Env): boolean {
  if (!origin) return true; // non-browser / same-origin clients
  const configured = (env.CLIENT_ORIGIN ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  if (configured.includes(origin)) return true;
  if (/^http:\/\/localhost(:\d+)?$/.test(origin)) return true;
  if (/^http:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) return true;
  return false;
}

const ROOM_CODE_RE = /^[A-Z0-9]{6}$/;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/health') {
      return Response.json({ status: 'ok' });
    }

    if (url.pathname !== '/ws') {
      return new Response('Not found', { status: 404 });
    }

    if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
      return new Response('Expected a WebSocket upgrade', { status: 426 });
    }

    const origin = request.headers.get('Origin');
    if (!isAllowedOrigin(origin, env)) {
      return new Response(`Origin ${origin} not allowed`, { status: 403 });
    }

    // The room code must be known before the upgrade, because it selects which
    // Durable Object handles the connection. The client generates it for
    // create, and already has it for join.
    const room = (url.searchParams.get('room') ?? '').toUpperCase();
    if (!ROOM_CODE_RE.test(room)) {
      return new Response('Invalid or missing ?room= code', { status: 400 });
    }

    const id = env.MINDI_ROOM.idFromName(room);
    return env.MINDI_ROOM.get(id).fetch(request);
  },
};
