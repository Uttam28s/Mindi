# Mindi backend — Cloudflare Worker + Durable Objects

Replaces the Render Express/socket.io server. One Durable Object instance per
room code, so a room is a real object with its own state instead of an entry in
a process-global `Map`.

**Why this exists:** the Render free tier spins down after 15 minutes idle, and
the paid Starter tier was ~$7/month. Durable Objects are on the Workers Free
plan and use WebSocket Hibernation, so an idle lobby costs nothing *and* never
sleeps. That also removes the need for the self-ping keepalive hack.

## Layout

| File | Role |
|---|---|
| `src/index.ts` | Worker entry: origin check, routes `/ws?room=CODE` to a DO |
| `src/room.ts` | `MindiRoom` DO: connections, room state, all game events |
| `../server/src/engine/` | Game rules — **shared, not duplicated** with the old server |

The engine (`deckBuilder`, `gameEngine`, `trickResolver`) is pure logic with no
Node APIs, so it compiles for Workers unchanged and stays the single source of
truth for the rules.

## Local development

```bash
cd worker && npm install
npm run dev            # wrangler dev on :8787
```

In another terminal, run the client with `VITE_SERVER_URL` **unset** — Vite
proxies `/ws` to `:8787` (see `vite.config.ts`):

```bash
pnpm dev:client
```

## Deploy

```bash
cd worker
npx wrangler login
npm run deploy
```

Note the deployed URL (`https://mindi-server.<subdomain>.workers.dev`), then:

1. Set `CLIENT_ORIGIN` in `wrangler.toml` `[vars]` to your Vercel URL and
   redeploy. `localhost` is always allowed, so you do not need to list it.
   Add any extra origins (e.g. a custom domain) comma-separated.
2. Set `VITE_SERVER_URL` to the Worker URL — in the **Vercel dashboard** and in
   local `.env`. Use the `https://` form; the client rewrites it to `wss://`.
3. Redeploy the client so the new URL is baked into the bundle.

Logs: `npm run tail`.

## Two things that constrain the design

**Hibernation resets memory.** When a DO hibernates, instance fields are lost
and the constructor re-runs. Room state is therefore persisted to DO storage on
every mutation and rehydrated lazily. A side benefit: games now survive a
restart, which they never did on Render.

**Free plan requires SQLite-backed DOs.** `wrangler.toml` uses
`new_sqlite_classes`, not `new_classes`. A KV-backed class will not deploy
without a paid plan — do not change that line.

## Free tier limits (per day, resets 00:00 UTC)

| Limit | Allowance | Notes |
|---|---|---|
| Requests | 100,000 | inbound WS messages bill 20:1, so ~2M messages |
| Duration | 13,000 GB-s | hibernation means idle lobbies do not accrue |
| Row writes | 100,000 | **the real ceiling** — see below |
| Row reads | 5,000,000 | |
| Storage | 5 GB | rooms are a few KB and are deleted when empty |

Row writes are the binding constraint, because state is saved on every move. A
full 4-player round is ~60 card plays plus lobby churn, so roughly 1,000+
complete games/day. Comfortable for launch; if you outgrow it, batch writes
(persist per completed trick rather than per card) before paying.

## Rollback

The Render server in `../server/` is untouched and still deployable. To revert,
point `VITE_SERVER_URL` back at the Render URL and restore the socket.io client
in `src/app/utils/socket.ts` from git history.
