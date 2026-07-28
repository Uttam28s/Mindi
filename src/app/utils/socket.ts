/**
 * Minimal socket.io-compatible client over a native WebSocket, talking to the
 * Cloudflare Worker + Durable Object backend.
 *
 * This deliberately mirrors the slice of the socket.io API that App.tsx uses
 * (.on / .off / .once / .emit / .connected / .disconnect) so that migrating off
 * socket.io required no changes to App.tsx at all.
 *
 * One structural difference from socket.io: a Durable Object is addressed by
 * room code, so the code must be known *before* the WebSocket opens. The app,
 * however, connects first and only then emits create_room/join_room. The shim
 * bridges that by deferring the real connection until it sees the first
 * room-bound emit, and reporting a synthetic `connect` immediately so the app's
 * existing flow proceeds unchanged.
 */

type Handler = (payload: any) => void;

/** https://host → wss://host ; empty → same origin (Vite proxies /ws in dev). */
function resolveWsBase(): string {
  const raw = (import.meta.env.VITE_SERVER_URL as string | undefined)?.trim().replace(/\/+$/, '');
  const origin = raw || window.location.origin;
  return origin.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:');
}

const ROOM_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
function generateRoomCode(): string {
  let code = '';
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < 6; i++) code += ROOM_CHARS[bytes[i] % ROOM_CHARS.length];
  return code;
}

/** How long to wait for the WebSocket to open before surfacing an error. */
const OPEN_TIMEOUT_MS = 10_000;

class MindiSocket {
  private ws: WebSocket | null = null;
  private handlers = new Map<string, Handler[]>();
  private onceHandlers = new Map<string, Handler[]>();
  private queue: string[] = [];
  private openTimer: ReturnType<typeof setTimeout> | null = null;

  /** Retained so a colliding room code can be retried transparently. */
  private pendingCreate: any = null;

  connected = false;

  // ── socket.io-compatible surface ─────────────────────────────────
  on(event: string, fn: Handler): this {
    const list = this.handlers.get(event) ?? [];
    list.push(fn);
    this.handlers.set(event, list);
    return this;
  }

  once(event: string, fn: Handler): this {
    const list = this.onceHandlers.get(event) ?? [];
    list.push(fn);
    this.onceHandlers.set(event, list);
    return this;
  }

  /** socket.io semantics: no handler argument removes every listener. */
  off(event: string, fn?: Handler): this {
    if (!fn) {
      this.handlers.delete(event);
      this.onceHandlers.delete(event);
      return this;
    }
    this.handlers.set(event, (this.handlers.get(event) ?? []).filter(h => h !== fn));
    this.onceHandlers.set(event, (this.onceHandlers.get(event) ?? []).filter(h => h !== fn));
    return this;
  }

  private dispatch(event: string, payload: any): void {
    for (const fn of this.handlers.get(event) ?? []) {
      try { fn(payload); } catch (err) { console.error(`[socket] handler for ${event} threw`, err); }
    }
    const onces = this.onceHandlers.get(event);
    if (onces?.length) {
      this.onceHandlers.delete(event);
      for (const fn of onces) {
        try { fn(payload); } catch (err) { console.error(`[socket] once handler for ${event} threw`, err); }
      }
    }
  }

  emit(event: string, payload: any = {}): this {
    // The first create_room / join_room decides which Durable Object we talk to.
    if (!this.ws) {
      if (event === 'create_room') {
        this.pendingCreate = payload;
        this.openConnection(generateRoomCode(), true);
      } else if (event === 'join_room') {
        const code = String(payload.roomCode ?? '').toUpperCase();
        if (!/^[A-Z0-9]{6}$/.test(code)) {
          this.dispatch('error', { code: 'BAD_ROOM', message: 'Room codes are 6 letters or digits.' });
          return this;
        }
        this.openConnection(code, false);
      } else {
        console.warn(`[socket] dropping "${event}" — no active room connection`);
        return this;
      }
    }

    const frame = JSON.stringify({ e: event, d: payload });
    if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.send(frame);
    else this.queue.push(frame);
    return this;
  }

  disconnect(): void {
    if (this.openTimer) { clearTimeout(this.openTimer); this.openTimer = null; }
    this.connected = false;
    this.queue = [];
    this.pendingCreate = null;
    const ws = this.ws;
    this.ws = null;
    try { ws?.close(1000, 'client disconnect'); } catch { /* already closed */ }
  }

  // ── Internals ────────────────────────────────────────────────────
  /** Fire `connect` on a later tick so callers can register once('connect') first. */
  announceReady(): void {
    setTimeout(() => this.dispatch('connect', undefined), 0);
  }

  private openConnection(code: string, create: boolean): void {
    const url = `${resolveWsBase()}/ws?room=${encodeURIComponent(code)}${create ? '&create=1' : ''}`;

    let ws: WebSocket;
    try {
      ws = new WebSocket(url);
    } catch (err) {
      this.dispatch('error', { code: 'CONNECT_FAILED', message: `Could not reach the game server. ${String(err)}` });
      return;
    }
    this.ws = ws;

    this.openTimer = setTimeout(() => {
      if (ws.readyState !== WebSocket.OPEN) {
        try { ws.close(); } catch { /* noop */ }
        this.dispatch('error', {
          code: 'CONNECT_TIMEOUT',
          message: 'Could not connect to the game server. Please try again or check your connection.',
        });
      }
    }, OPEN_TIMEOUT_MS);

    ws.onopen = () => {
      if (this.openTimer) { clearTimeout(this.openTimer); this.openTimer = null; }
      this.connected = true;
      for (const frame of this.queue) ws.send(frame);
      this.queue = [];
    };

    ws.onmessage = ev => {
      let msg: { e?: string; d?: any };
      try { msg = JSON.parse(ev.data as string); } catch { return; }
      if (!msg.e) return;

      // A code collision is recoverable: pick a new one and replay the create.
      if (msg.e === 'error' && msg.d?.code === 'CODE_TAKEN' && this.pendingCreate) {
        const payload = this.pendingCreate;
        this.disconnect();
        this.pendingCreate = payload;
        this.openConnection(generateRoomCode(), true);
        this.queue.push(JSON.stringify({ e: 'create_room', d: payload }));
        return;
      }
      if (msg.e === 'room_created' || msg.e === 'room_joined') this.pendingCreate = null;

      this.dispatch(msg.e, msg.d);
    };

    ws.onerror = () => {
      // A failed upgrade (404 unknown room, 403 origin) surfaces here, not in
      // onmessage — the close handler reports it so the UI is never left hanging.
      if (this.ws === ws && !this.connected) {
        this.dispatch('error', {
          code: 'CONNECT_FAILED',
          message: create
            ? 'Could not reach the game server. Please try again.'
            : `Could not join room ${code}. Check the code and try again.`,
        });
      }
    };

    ws.onclose = () => {
      if (this.openTimer) { clearTimeout(this.openTimer); this.openTimer = null; }
      const wasConnected = this.connected;
      if (this.ws === ws) {
        this.connected = false;
        this.ws = null;
      }
      if (wasConnected) this.dispatch('disconnect', undefined);
    };
  }
}

let socket: MindiSocket | null = null;

export function getSocket(): MindiSocket {
  if (!socket) socket = new MindiSocket();
  return socket;
}

export function connectSocket(): MindiSocket {
  const s = getSocket();
  if (!s.connected) s.announceReady();
  return s;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}

export function isConnected(): boolean {
  return socket?.connected ?? false;
}
