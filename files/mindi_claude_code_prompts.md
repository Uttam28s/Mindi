# Mindi (Mendikot) Web Game — Claude Code Development Prompts

**Version:** 1.1  
**Date:** April 2026  
**How to use:** Copy each prompt in sequence into Claude Code. Each prompt builds on the previous one. Complete and verify each phase before proceeding to the next.

---

## How to Use This Document

Each section below is a **self-contained prompt** to paste into Claude Code. The prompts are ordered so that each one builds on what was created in the previous step. Do not skip phases. At the end of each phase, a "Verification Checklist" tells you what to confirm before moving on.

Before you begin, make sure you have the following installed on your machine:
- Node.js 20 or later
- npm or yarn
- A code editor (VS Code recommended)
- Git (optional but recommended)

---

## Phase 1: Project Scaffolding & Setup

### Prompt 1.1 — Create the Project Structure

```
Create a new full-stack web application called "mindi-game" for building a Mindi (Mendikot) card game. Set it up as a monorepo with the following structure:

/mindi-game
  /client         — React + Vite frontend
  /server         — Node.js + Express + Socket.io backend
  /shared         — Pure JavaScript/TypeScript modules shared by both client and server

Initialize the following:
1. Root package.json with scripts: "dev" (runs both client and server concurrently), "build", and "start".
2. /client — Vite + React app with TypeScript, TailwindCSS v3, and socket.io-client.
3. /server — Node.js app with Express, Socket.io, cors, and dotenv. Use TypeScript.
4. /shared — A plain TypeScript module (no framework dependencies).

Install concurrently at the root level to run client and server together.

Set up a basic client/server handshake: when the client loads, it connects to the server via Socket.io, the server logs "Client connected," and the client console logs "Connected to server." Verify this works with "npm run dev" at the root.

Use port 3001 for the server and port 5173 for the Vite client. Add a Vite proxy so client API calls to /api and WebSocket connections go to the server on 3001.
```

**Verification Checklist after Prompt 1.1:**
- Running `npm run dev` from the root starts both client and server simultaneously.
- Opening `http://localhost:5173` shows the default React page.
- The server terminal shows "Client connected" when the browser loads the page.
- No TypeScript errors on startup.

---

## Phase 2: Core Game Engine (Shared Logic)

### Prompt 2.1 — Card Types and Deck Builder

```
In the /shared/engine directory, create the core Mindi game types and a deck builder module. This logic must be pure (no React, no Socket.io, no DOM) so it can be used on both server and client.

First, create /shared/types.ts with the following TypeScript interfaces:

- Card: { suit: 'hearts'|'diamonds'|'spades'|'clubs', rank: 'A'|'K'|'Q'|'J'|'10'|'9'|'8'|'7'|'2'|'3', isFiller: boolean, deckIndex: number, id: string }
- Suit: the union type of the four suits
- Rank: the union type of all card ranks
- TeamId: 0 | 1
- TrumpMethod: 'random' | 'band_hukum_a' | 'band_hukum_b' | 'cut_hukum'
- GameConfig: { playerCount: 4|6|8|10, deckCount: 2|3|4|5, trumpMethod: TrumpMethod, gamePointsTarget: 3|5|7|10, totalMindis: 8|12|16|20, mindiMajority: 5|7|9|11 }
- Player: { id: string, name: string, seatIndex: number, teamId: TeamId, hand: Card[], cardCount: number }

Then create /shared/engine/deckBuilder.ts with these exported functions:

1. buildActiveDeck(deckIndex: number): Card[]
   Returns 28 cards (ranks 8,9,10,J,Q,K,A across all 4 suits) with isFiller=false.

2. getFillerCards(playerCount: 4|6|8|10): Card[]
   Returns the exact filler cards for each player count:
   - 4 players: 7♥, 7♦, 7♠, 7♣  (4 fillers, isFiller=true)
   - 6 players: 2♥, 7♥, 7♦, 2♠, 7♠, 7♣  (6 fillers, isFiller=true)
   - 8 players: 2♥, 7♥, 2♦, 7♦, 2♠, 7♠, 2♣, 7♣  (8 fillers, isFiller=true)
   - 10 players: 2♥, 7♥, 2♦, 7♦, 2♠, 7♠, 2♣, 7♣, 3♥, 3♦  (10 fillers, isFiller=true)
   All filler cards have deckIndex=0.

3. buildFullDeck(playerCount: 4|6|8|10): Card[]
   Builds the complete game deck: create N active decks (deckIndex 0 to N-1), combine them, add filler cards, then shuffle using Fisher-Yates. Asserts that the result length equals playerCount * 15.

4. dealHands(deck: Card[], playerCount: number): Card[][]
   Splits the shuffled deck into playerCount hands of 15 cards each. Returns an array of hands.

5. getGameConfig(playerCount: 4|6|8|10, trumpMethod: TrumpMethod, gamePointsTarget: 3|5|7|10): GameConfig
   Returns the fully populated GameConfig object for a given setup.

Write a short test (just a console.log script, no testing framework needed yet) that:
- Builds decks for all four player counts
- Verifies total card count equals playerCount * 15 for each
- Verifies each hand has exactly 15 cards
- Verifies the correct number of mindi (10-rank) cards
- Verifies the correct number of fillers
Log "ALL CHECKS PASSED" if everything is correct.
```

### Prompt 2.2 — Card Rank Comparator & Trick Resolver

```
In /shared/engine/, create cardUtils.ts and trickResolver.ts.

In cardUtils.ts, implement:

1. RANK_ORDER: Record<Rank, number>
   Maps each rank to a numeric value for comparison:
   A=14, K=13, Q=12, J=11, 10=10, 9=9, 8=8, 7=7 (filler), 2=2 (filler), 3=3 (filler)
   Note: 7 > 2 > 3 for filler comparison, all filler ranks are below active ranks (all < 8's value of 8).

2. compareCards(a: Card, b: Card, trumpSuit: Suit | null, ledSuit: Suit): -1 | 0 | 1
   Returns 1 if card a beats card b, -1 if b beats a, 0 if equal rank and suit (same card from same deck — shouldn't occur in single-deck play).
   Rules:
   - Trump beats non-trump always.
   - Among non-trump: only cards of the led suit compete; others cannot win.
   - Among same suit: higher RANK_ORDER wins.
   - **Duplicate card rule (multi-deck):** When two cards have the same suit AND same rank, the LATER-played card wins. Implement `resolveTrick` using a `>=` comparison so that iterating in play order naturally gives the final occurrence priority.

3. isMindi(card: Card): boolean
   Returns true if card.rank === '10'.

In trickResolver.ts, implement:

1. resolveTrick(trick: { seatIndex: number; card: Card }[], ledSuit: Suit, trumpSuit: Suit | null): number
   Returns the seatIndex of the trick winner. Evaluates all cards using compareCards and returns the seat that played the winning card.

2. countMindisInTrick(trick: { seatIndex: number; card: Card }[]): number
   Returns the count of 10-rank cards in the trick.

3. determineCutHukum(card: Card, ledSuit: Suit): Suit | null
   Used for cut hukum: if the played card's suit differs from the led suit, returns that card's suit as the new trump; otherwise returns null.

Add the trick resolver to the test script from Prompt 2.1. Create at least 5 sample tricks with known winners and verify the resolver picks the correct winner for each.
```

### Prompt 2.3 — Game State Machine

```
In /shared/engine/, create gameEngine.ts. This is the authoritative game logic module. It must be a pure state machine — it takes a current GameState and an action, validates the action, and returns a new GameState. No side effects.

First, expand /shared/types.ts to include:

- TrickEntry: { seatIndex: number; card: Card }
- CompletedTrick: { cards: TrickEntry[]; winnerSeatIndex: number; mindisInTrick: number }
- RoundState: {
    dealerSeatIndex: number,
    currentLeaderSeatIndex: number,
    currentTurnSeatIndex: number,
    trumpSuit: Suit | null,
    trumpCard: Card | null,        // server-side only for band hukum
    trumpRevealed: boolean,
    currentTrick: { cards: TrickEntry[]; ledSuit: Suit | null },
    completedTricks: CompletedTrick[],
    teamMindis: [number, number],
    teamTricks: [number, number],
    trickNumber: number
  }
- RoundResult: { winnerTeamId: TeamId, category: 'normal'|'mendikot'|'whitewash', pointsAwarded: number }
- GamePhase: 'lobby' | 'trump_selection' | 'playing' | 'round_end' | 'game_over'
- GameState: {
    roomCode: string,
    config: GameConfig,
    players: Player[],
    round: RoundState,
    gamePoints: [number, number],
    phase: GamePhase,
    winnerTeamId: TeamId | null
  }

Then implement these functions in gameEngine.ts:

1. initRound(gameState: GameState, dealerSeatIndex: number): GameState
   Builds and deals a fresh deck, assigns hands to players, sets round state to initial values, sets phase to 'trump_selection' (or 'playing' for cut_hukum/random since trump is immediately known).

2. applyRandomTrump(gameState: GameState): GameState
   For random trump method: draws a card from the fresh deck, sets trumpSuit, sets phase to 'playing'.

3. applyBandHukum(gameState: GameState, seatIndex: number, card: Card): GameState
   For band hukum: validates the card is in the player's hand, stores it as trumpCard (hidden), does NOT set trumpSuit yet, sets phase to 'playing'.

4. revealBandHukum(gameState: GameState): GameState
   Reveals the hidden trump card, sets trumpSuit, returns card to player's hand.

5. playCard(gameState: GameState, seatIndex: number, cardId: string): { newState: GameState; error?: string }
   The main action function. Validates: it is this player's turn, the card is in their hand, the play is legal (follow-suit rule). If valid: removes the card from the player's hand, adds it to currentTrick. If this player is last in the trick, calls resolveTrick and updates state (assign won cards, update mindi/trick counts, set next leader, increment trickNumber). If this was trick 15, call evaluateRound(). Returns the new state or an error string.

6. evaluateRound(gameState: GameState): GameState
   Determines the round winner based on mindi counts (and trick tiebreaker). Calculates pointsAwarded (1/2/3 for normal/mendikot/whitewash). Updates gamePoints. Determines next dealer per the rotation rules. Sets phase to 'round_end' or 'game_over' if a team reached the target.

7. getNextTurnSeat(currentSeat: number, playerCount: number): number
   Returns the next seat in anticlockwise order: (currentSeat - 1 + playerCount) % playerCount.

8. canPlayCard(hand: Card[], card: Card, ledSuit: Suit | null): boolean
   Returns true if playing this card is legal. If ledSuit is null (this player is leading), any card is legal. Otherwise: if the player has any card of the led suit, they must play that suit. Returns false if the played card is off-suit when they have the led suit.

Expand the test script to simulate a complete 4-player round from initRound to evaluateRound with hardcoded cards, verifying mindi counts and round result.
```

**Verification Checklist after Phase 2:**
- All three engine modules compile with no TypeScript errors.
- The test script prints "ALL CHECKS PASSED."
- A simulated full round correctly identifies the winning team and result category.

---

## Phase 3: Local Game Mode (Frontend Only)

### Prompt 3.1 — Basic Game Layout & Card Component

```
Build the game's visual foundation in the React client. Use TailwindCSS for all styling.

1. Create /client/src/components/Card.tsx
   Renders a single playing card. Props: { card: Card, faceUp: boolean, selected?: boolean, playable?: boolean, onClick?: () => void }
   
   Design:
   - White rounded rectangle with a subtle drop shadow.
   - Faceup: show rank in top-left and bottom-right corners, suit symbol in center. Use red for hearts/diamonds, black for spades/clubs.
   - Facedown: show a decorative back pattern (simple geometric CSS pattern is fine — no images required).
   - If isFiller: show a small grey badge "FILLER" at the bottom edge.
   - If selected: add a blue glow border.
   - If playable=false: reduce opacity to 0.5.
   - Cards should be vertically compact (about 80px × 110px on desktop, slightly smaller on mobile).

2. Create /client/src/components/PlayerHand.tsx
   Renders a fan of Card components from a cards array prop.
   Cards fan out slightly with CSS transforms (each card slightly rotated).
   On mobile, cards are displayed in a horizontally scrollable row with no rotation.
   When a card is clicked, it calls an onCardClick(card) callback.
   The component highlights which cards are playable by passing playable=true/false based on a getPlayableCards(hand, ledSuit) function.

3. Create /client/src/components/TrickArea.tsx
   Renders the center of the table showing the current trick in progress.
   Each played card is positioned at one of N positions around a circular area (use CSS absolute positioning with calculated angles).
   Shows a glowing highlight on the most recently played card.
   When a trick is complete (all N cards played), shows a 1-second animation of cards collapsing toward the winner's position, then clears.

4. Create /client/src/components/Scoreboard.tsx
   A compact sidebar or top-bar component showing:
   - Team A vs Team B game points
   - Current round: Mindis captured per team (e.g., "♦ Mindis: 3 vs 5")
   - Current round: Tricks won per team
   - Current trump suit (or "Hidden" or "TBD")

5. Create /client/src/screens/GameTable.tsx
   The main game screen that assembles all components. For now it can show placeholder data (hardcoded game state). Layout:
   - Scoreboard at the top
   - TrickArea in the center
   - PlayerHand at the bottom
   - Placeholder card-count indicators for other players arranged around the table
   - A "Trump" badge in the upper-right corner
```

### Prompt 3.2 — Local Game State & Flow

```
Wire up the local game mode using the shared game engine. All logic runs client-side — no server communication.

1. Create /client/src/store/localGameStore.ts using Zustand.
   State: { gameState: GameState | null, localPlayerSeat: number, phase: 'setup' | 'trump_selection' | 'playing' | 'round_end' | 'game_over' }
   Actions:
   - startLocalGame(playerCount, playerNames, trumpMethod, gamePointsTarget): initializes a new GameState using the shared engine's initRound, sets localPlayerSeat to 0 (the first player always starts on this device).
   - playCard(cardId): calls the engine's playCard, updates state.
   - nextRound(): calls initRound with the next dealer.
   - resetGame(): clears all state.

2. Create /client/src/screens/LocalSetup.tsx
   A form screen where players set up a local game:
   - Input fields for player names (1 per player, dynamically shown based on count)
   - Player count selector (4 / 6 / 8 / 10)
   - Trump method selector with a short description of each method
   - Game points target selector (3 / 5 / 7 / 10)
   - "Start Game" button

3. Update GameTable.tsx to read from localGameStore.
   Show the current player's hand at the bottom (with the peek-shield pattern for local mode).
   
4. Implement the "Pass Device" flow for local mode:
   After a player plays their card, show a full-screen "Pass to [Next Player Name]" overlay.
   Display a "Tap to Continue" button.
   When tapped, animate the overlay away to reveal the next player's hand.
   This prevents players from seeing each other's cards.

5. Add a "Last Trick" toggle button that shows/hides the most recently completed trick (use completedTricks[-1] from game state).

6. Wire up the RoundResult screen:
   When phase becomes 'round_end', show RoundResult overlay listing which team won, the category (Normal Win / Mendikot / Whitewash), points awarded, and updated totals.
   A "Start Next Round" button advances the game.

7. Wire up the GameOver screen:
   When phase becomes 'game_over', show:
   - The winning team name (Team A / Team B).
   - Final cumulative game-point scores for both teams.
   - A per-team breakdown listing each member's name alongside the team's **hath (tricks)** and **mindi** counts from the final round. This gives all players a clear summary of who contributed to the result.
   - "Play Again" button (returns to setup) and "Home" button.
   Pass `players`, `teamMindis`, and `teamTricks` from the final game state into the GameOver component so it can render the breakdown without extra data fetching.

Test the complete local game flow for 4 players from setup through a full game with at least one Mendikot scenario (manually arrange the deck in the test to confirm it fires correctly).
```

### Prompt 3.3 — Trump Selection UI Flows

```
Implement all three trump selection UI flows as interactive screens layered on top of the GameTable.

1. Random Trump Flow:
   When phase is 'trump_selection' and method is 'random':
   Animate a card being "drawn" from a deck in the center of the screen.
   Reveal the card with a flip animation.
   Display "Trump is [Suit Symbol] [Suit Name]!" with the suit color.
   After 2 seconds (or a tap), dismiss and begin play.

2. Band Hukum Flow (both versions A and B):
   When phase is 'trump_selection' and method is 'band_hukum_a' or 'band_hukum_b':
   Show the player-to-dealer's-right their full hand in a modal overlay.
   Prompt: "Select your trump card — place it face down."
   Player taps a card. That card is removed from their hand and shown face-down on the table.
   For all other players: a small face-down card icon persists near the center of the table throughout the game as a reminder that trump is hidden.
   
   For Version A: when any player cannot follow suit during play, automatically flip the hidden card face-up with an animation, display "Trump Revealed: [Suit]!", then continue play.
   For Version B: when a player cannot follow suit, show a modal with two options: "Reveal Trump" or "Play Without Knowing Trump." If they choose reveal, execute the same reveal animation and set the must-play-trump rule for that player this trick.

3. Cut Hukum Flow:
   No special pre-game UI needed.
   During play: when a player plays off-suit for the first time (triggering cut hukum), display a brief overlay: "Trump Cut! [Suit Name] is now Trump!" with the suit symbol and color.
   This overlay auto-dismisses after 1.5 seconds.

Make sure all trump method overlays are mobile-friendly (full-screen on small devices, centered modal on desktop).
```

**Verification Checklist after Phase 3:**
- You can complete a full local 4-player game from setup to game-over in the browser.
- The pass-device flow correctly hides each player's hand between turns.
- All three trump methods work and display correctly.
- Mindi counts and scores update correctly after each trick.
- The Mendikot win category fires when one team captures all 10s.

---

## Phase 4: Online Multiplayer (Backend + Real-Time)

### Prompt 4.1 — Server Setup & Room Manager

```
Build the multiplayer backend in /server.

1. Set up server.js (or server.ts) as the main entry point:
   - Express app on port 3001
   - Socket.io attached to the HTTP server with CORS configured to allow the client origin
   - Serve a GET /api/health endpoint that returns { status: 'ok', timestamp: Date.now() }

2. Create /server/rooms/RoomManager.ts:
   A class that manages all active game rooms in a Map<string, Room>.
   
   Room interface: { code: string, hostSocketId: string, config: GameConfig, players: Map<string, { socketId: string, name: string, seatIndex: number }>, gameState: GameState | null, status: 'waiting' | 'playing' | 'finished', createdAt: number }
   
   Methods:
   - createRoom(hostSocketId, playerName, config): Room — generates a 6-character alphanumeric code (using crypto.randomBytes for security), creates the room, adds the host as seat 0.
   - joinRoom(code, socketId, playerName): { room: Room, seatIndex: number } | { error: string } — validates the room exists, is in 'waiting' status, is not full, then adds the player.
   - getRoom(code): Room | undefined
   - startGame(code, hostSocketId): { gameState: GameState } | { error: string } — validates host, validates room is full, initializes the game state, sets status to 'playing'.
   - getRoomBySocket(socketId): Room | undefined — for handling disconnections.
   - cleanupExpiredRooms(): void — removes rooms older than 30 minutes that haven't started.
   
   Run cleanupExpiredRooms on a 5-minute interval.

3. Create /server/socket/socketHandlers.ts:
   Register all Socket.io event handlers:
   - 'create_room': calls RoomManager.createRoom, emits 'room_created' with roomCode and initial lobby state.
   - 'join_room': calls RoomManager.joinRoom, emits 'room_joined' to the joining player and 'player_joined' to all others in the room.
   - 'start_game': calls RoomManager.startGame, then for each player in the room, emits 'game_started' with the full public game state AND their private hand separately (never send other players' hands).
   - 'disconnect': calls getRoomBySocket, notifies remaining players, handles the 60-second reconnect window (use setTimeout, store the timer in the room).

4. Create /server/game/GameActionHandler.ts:
   - handlePlayCard(room, socketId, cardId): validates turn, calls shared engine playCard, updates room.gameState, emits 'card_played' to all players in room, and if trick complete, emits 'trick_complete'. If round complete, emits 'round_complete'. If game over, emits 'game_over'.
   - handleRequestTrumpReveal(room, socketId): validates band hukum B conditions, calls revealBandHukum, emits 'trump_revealed' to all.
   - handleNextRound(room, socketId): validates host, calls initRound, emits 'round_started' with new public state and private hands to each player.
   
   IMPORTANT: Never send Card objects for other players' hands to any client. The server only sends each player their own hand. All other players appear as { seatIndex, cardCount } in the broadcast.
```

### Prompt 4.2 — Client Multiplayer Integration

```
Add multiplayer support to the React client.

1. Create /client/src/services/socketService.ts
   A singleton wrapper around socket.io-client.
   Methods: connect(), disconnect(), emit(event, data), on(event, callback), off(event).
   Exposes the socket instance for direct use when needed.

2. Create /client/src/store/multiplayerStore.ts using Zustand.
   State: { roomCode: string | null, mySocketId: string | null, mySeat: number | null, myHand: Card[], publicGameState: PublicGameState | null, lobbyPlayers: LobbyPlayer[], connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'in_game' }
   
   PublicGameState is GameState with all player hands replaced by { seatIndex, name, cardCount } — no private cards.
   
   Actions (each connects to socket events):
   - createRoom(playerName, config): emits 'create_room', listens for 'room_created'
   - joinRoom(roomCode, playerName): emits 'join_room', listens for 'room_joined'
   - startGame(): emits 'start_game'
   - playCard(cardId): emits 'play_card'
   - requestTrumpReveal(): emits 'request_trump_reveal'
   - nextRound(): emits 'next_round'
   
   Socket listeners (update store state):
   - 'player_joined': update lobbyPlayers
   - 'game_started': set myHand from the private hand in the event, set publicGameState
   - 'card_played': update publicGameState.currentTrick
   - 'trick_complete': update publicGameState trick counts, mindi counts, animate trick resolution
   - 'trump_revealed': update trump display
   - 'round_complete': show round result
   - 'game_over': show game over screen
   - 'error': show error toast/notification

3. Create /client/src/screens/MultiplayerLobby.tsx
   Shows the room code in large text with a "Copy" button.
   Lists joined players with seat numbers and team assignments.
   Each player entry shows their actual name. The current user's own entry must show a visible "(You)" badge alongside their name — this allows a player who just joined to quickly confirm their seat. Never show "You" as the displayed name of another player (all players enter their real name on join/create).
   Host entry shows a crown icon in addition to the "(You)" badge if the host is the current viewer.
   Shows "Waiting for X more players" progress.
   Host sees a "Start Game" button that activates only when the room is full.
   Non-hosts see "Waiting for host to start..."
   Displays game settings summary (trump method, player count, points target).

4. Update /client/src/screens/GameTable.tsx to work in multiplayer mode:
   When in multiplayer mode (detected by multiplayerStore.connectionStatus === 'in_game'):
   - Read public game state from multiplayerStore (not localGameStore)
   - Read the player's own hand from multiplayerStore.myHand
   - Disable card clicking when it is not this player's turn (mySeat !== publicGameState.round.currentTurnSeatIndex)
   - No "pass device" flow needed — each person has their own device
   - Show other players' hands as face-down card stacks showing only the cardCount

5. Update /client/src/screens/HomeScreen.tsx to show:
   - "Local Game" button → LocalSetup screen
   - "Online Game" → choice between "Create Room" and "Join Room"
   - "Create Room" → Create Game setup form → MultiplayerLobby
   - "Join Room" → enter name + code form → MultiplayerLobby

Test multiplayer with two browser tabs pointing to localhost. Verify that each tab only sees its own hand, both tabs see the same public game state, and card plays synchronize in real time.
```

**Verification Checklist after Phase 4:**
- Two (or more) browser tabs can join the same room and play a full game.
- Each player only sees their own hand — opening DevTools in one tab does not reveal another player's cards.
- The game state updates simultaneously across all tabs when a card is played.
- A player disconnecting shows the "reconnecting" state to other players.
- Room codes work correctly and expired rooms are cleaned up.

---

## Phase 5: Polish, Animations & UX

### Prompt 5.1 — Animations & Visual Polish

```
Add animations and visual improvements to make the game feel alive.

1. Card Play Animation:
   When a card is played (in both local and multiplayer modes), animate it flying from the player's hand area to its position in the TrickArea. Use CSS transitions with transform: translate. Duration: 250ms with ease-out.

2. Trick Win Animation:
   When a trick is resolved, all 4-10 cards in the trick should animate sliding toward the winner's position (a shrink + translate). After 800ms, the cards disappear. Then the next trick begins.

3. Mindi Capture Notification:
   When a trick is won containing one or more 10-rank cards, briefly display a badge at the winning team's scoreboard section: "🎯 Mindi! +N" where N is the count. Show for 1.5 seconds then fade out. Use a different, more dramatic badge for "🎯🎯 Double Mindi!" when multiple 10s are in one trick.

4. Trump Reveal Animation (Band Hukum):
   When trump is revealed, the face-down card on the table does a 3D flip animation (CSS perspective flip) revealing the card face. Display "Trump Revealed!" text overlay for 1.5 seconds.

5. Mendikot / Whitewash Celebration:
   On the RoundResult screen, if the result is Mendikot or Whitewash, trigger a confetti animation (use the 'canvas-confetti' npm package). For whitewash, the confetti should be more intense.

6. Filler Card Visual:
   Filler cards should have a lighter visual weight — a cream/off-white background instead of pure white, with a subtle "FILLER" watermark at a diagonal across the card face. Add a tooltip on hover/long-press: "Filler card — cannot win a trick."

7. Player Turn Indicator:
   The current player's section of the table should have a soft pulsing glow (CSS animation: pulse) in their team color. This makes it immediately obvious whose turn it is without needing to read text.

8. Mobile Gesture Support:
   On mobile, implement swipe-up on a card to play it (instead of requiring a double-tap). Show a visual "swipe up to play" hint on the first turn.

9. Sound Effects (Optional — implement if time permits):
   Use the Web Audio API to generate simple programmatic sound effects:
   - Card play: a soft "whoosh" click
   - Trick win: a brief positive chime
   - Mendikot: a triumphant 3-note ascending tone
   - Whitewash: a fanfare tone
   Keep all sounds short (under 0.5 seconds) and give players a mute toggle.
```

### Prompt 5.2 — Rule Explainer & Help System

```
Add an in-game help system so new players can learn the Gujarat Mindi rules without leaving the app.

1. Create /client/src/components/HelpModal.tsx
   A full-screen modal accessible from a "?" button always visible in the top-right corner of the GameTable.
   
   The modal has tabs:
   - "How to Win": explains the mindi capture objective, majority rule, and tiebreaker
   - "Card Ranks": shows a visual chart of card ranks from Ace (highest) down to filler cards (lowest), with filler cards visually highlighted
   - "Trump (Hukum)": explains all three trump methods with simple diagrams
   - "Special Results": explains Normal Win, Mendikot, and Whitewash with point values
   - "Filler Cards": specifically explains why filler cards exist, which ones are in the current game (based on player count), and their behavior rules

2. Add contextual tooltips during the game:
   - First time trump is revealed: show a brief tooltip "This is now the trump suit — it beats all other suits"
   - First time a filler card appears in someone's hand: show "This is a filler card — it ranks below 8 and cannot win a trick"
   - First Mendikot of the session: show "Mendikot! Your team captured all [N] mindis — worth 2 points!"

3. Create /client/src/components/FillerExplainer.tsx
   A small collapsible panel shown during game setup that explains why filler cards are being added for the current player count. Display it as: "With [N] players and [D] decks, we have [X] active cards but need [X+Y] for 15 cards each. Adding [Y] filler cards: [list the specific fillers with suit symbols]."

4. Add a "Deck Info" button in the lobby that shows the complete card composition for the current game: how many active cards by suit, how many of each rank, and the full filler set.
```

### Prompt 5.3 — Home Screen & Navigation Polish

```
Polish the home screen and overall navigation flow.

1. Redesign HomeScreen.tsx:
   Show the game title "Mindi" in a large, stylized font.
   Below it, a subtitle: "The Gujarati Card Game" in a smaller weight.
   Add the Gujarati script: "મીંડીકોટ" as a decorative element below the title.
   Two prominent call-to-action buttons: "Play Local" and "Play Online."
   A small "How to Play" link that opens the HelpModal.

2. Create a LoadingScreen.tsx:
   Shown briefly while the socket connects. Display an animated card-dealing animation (cards fanning out using CSS) with the text "Connecting..."

3. Add connection status indicator:
   A small dot in the corner (green = connected, yellow = connecting, red = disconnected) visible during online play. On hover/tap it shows a tooltip with the status text.

4. Implement proper browser back-button behavior:
   Use React Router (add it if not yet installed) for screen navigation.
   Routes: / (Home), /local (LocalSetup), /create (CreateRoom), /join (JoinRoom), /lobby/:roomCode (Lobby), /game/:roomCode (GameTable).
   The browser back button should work naturally (e.g., going back from the lobby shows the home screen with a confirmation "Are you sure you want to leave the room?").

5. Add a "Share Room Code" button in the Lobby:
   On mobile, uses the native Web Share API (navigator.share) to share the room code.
   On desktop, copies the code + a join link to clipboard.
   The join link format: https://[your-domain]/join?code=MINDI7
   When someone opens this link, the Join Room form is pre-filled with that code.
```

**Verification Checklist after Phase 5:**
- All animations play smoothly without layout shifts.
- The Help modal explains the filler card system clearly.
- Mobile experience is fully usable (test on actual phone or Chrome DevTools mobile simulation).
- The share link works — opening it pre-fills the room code.
- The overall visual design feels polished and consistent.

---

## Phase 6: Testing & Deployment Preparation

### Prompt 6.1 — Unit Tests for Game Engine

```
Add unit tests for the core game engine using Vitest (which integrates natively with Vite).

Install vitest and @vitest/ui at the root or in the shared package.

Create /shared/engine/__tests__/ with the following test files:

1. deckBuilder.test.ts:
   - Test that each player count produces exactly playerCount * 15 total cards
   - Test that each configuration has the exact correct number of filler cards
   - Test that each configuration has the correct number of mindis (10s)
   - Test that all card IDs are unique within a built deck
   - Test that getFillerCards returns the exact specified filler set for 6 players (the user-specified example)
   - Test that buildFullDeck produces different orderings on repeated calls (shuffle test)

2. trickResolver.test.ts:
   Write tests for at least these scenarios:
   - Trump beats non-trump
   - Higher card of led suit beats lower card
   - Off-suit card (non-trump, non-led) does not win even if high rank
   - Filler card loses to active card of same suit
   - Filler 7 beats filler 2 of same suit when no active cards present
   - Multiple trumps played: highest trump wins
   - No trump played: highest card of led suit wins
   - Correct seatIndex is returned as winner

3. gameEngine.test.ts:
   - Test that initRound deals 15 cards to each player
   - Test that canPlayCard correctly enforces the follow-suit rule
   - Test that playing a card removes it from the player's hand
   - Test that trick 15 completion triggers evaluateRound
   - Test mendikot detection (one team gets all mindis)
   - Test whitewash detection (one team wins all 15 tricks)
   - Test the dealer rotation rules for each scenario (dealer's team wins, loses, loses by whitewash)
   - Test the tiebreaker (equal mindis, majority tricks)

Run tests with: npx vitest run
All tests must pass with 0 failures.
```

### Prompt 6.2 — Build, Optimization & Deployment Config

```
Prepare the application for production deployment.

1. Configure Vite for production build:
   - Code splitting: separate chunks for the game engine (shared), the main app, and Socket.io client.
   - Asset optimization: enable minification.
   - Environment variables: use VITE_SERVER_URL for the WebSocket server URL (defaults to localhost:3001 in development, reads from .env in production).

2. Configure the server for production:
   - Add a production mode where the Express server also serves the built client static files from /client/dist.
   - In production mode, a single Node.js process serves both the static client and the WebSocket server on the same port (default 3001, configurable via PORT env var).
   - Add the following environment variables via .env.example: PORT, NODE_ENV, CLIENT_URL (for CORS).

3. Create a Dockerfile for the server:
   FROM node:20-alpine
   Sets up the server, copies the built client dist into the server's public directory.
   Exposes PORT.
   CMD: ["node", "server.js"]

4. Create a docker-compose.yml for local production testing:
   One service: the Node.js app, exposed on port 3001.
   Mount a .env file.

5. Add a root-level build script that:
   - Builds the shared module (tsc)
   - Builds the client (vite build)
   - Builds the server (tsc)
   - Copies the client dist into the server's public directory

6. Update the server's Express app to serve static files from the public directory when NODE_ENV === 'production', with a catch-all route that serves index.html for any unmatched routes (for React Router client-side routing).

7. Add a /api/health endpoint that returns:
   { status: 'ok', activeRooms: N, connectedPlayers: N, uptime: process.uptime() }

Test the production build locally with: npm run build && node server/dist/server.js
Verify the app loads correctly and a multiplayer game can be played.
```

### Prompt 6.3 — Final QA & Edge Case Hardening

```
Run through a final quality assurance pass, fixing edge cases and hardening the application.

1. Test and fix these specific edge cases:

a) Band Hukum Version B edge case: Player A plays a card that happens to be of the eventual trump suit before trump is revealed. Player B then requests reveal. Verify in the UI and in the engine that Player A's card does NOT count as trump — it is treated as a plain card. Add a visual indicator in the completed trick view if this scenario happened.

b) Multiple mindis in one trick: Arrange a game scenario where 3 or 4 ten-rank cards all appear in the same trick (possible with multiple decks). Verify all are correctly counted and awarded to the winning team. Verify the "Multi-Mindi" notification fires.

c) Filler card as only trump: If the trump suit is, say, clubs, and a player holds only filler clubs (7♣ or 2♣) and no active clubs, they can still play their filler as trump. Verify it counts as a trump in trick resolution and can beat non-trump cards (since any trump beats non-trump regardless of rank).

d) All 15 tricks won by one team (Whitewash): Verify that whitewash is detected correctly and awards 3 game points. Verify the confetti animation fires.

e) Game points tiebreaker at target: If both teams reach the target in the same round (e.g., target is 5 and both teams somehow reach 5 in the same round — this can happen if a team's Mendikot pushes them over but the other team also had accumulated points), the winning team of the current round wins.

2. Add input validation on all user-facing forms:
   - Player names: 1-20 characters, alphanumeric + spaces only
   - Room codes: exactly 6 characters, alphanumeric only, auto-uppercase
   - Prevent XSS in player names by sanitizing before displaying

3. Add error boundaries in React around the GameTable and Lobby components so that a JavaScript runtime error doesn't crash the entire app — show a "Something went wrong, please refresh" message instead.

4. Final mobile testing:
   - Test on 375px wide viewport (iPhone SE size)
   - Verify all buttons are at least 44px × 44px (touch target size)
   - Verify the player's hand cards are all visible and tappable on mobile
   - Verify no horizontal scroll on any screen except the hand area

5. Add a favicon: a simple card suit symbol (♠ or a 10 card image) as an SVG favicon.

6. Update the README.md at the root with:
   - Project description
   - Local development setup (npm install + npm run dev)
   - Production build instructions
   - Environment variables reference
   - Brief explanation of the custom filler card system for future contributors
   - Architecture overview diagram (ASCII art is fine)

After all of the above, run the full test suite one more time (npx vitest run) and verify 0 failures. Then run the production build and do one final end-to-end test of a complete 4-player online game from room creation to game over.
```

**Final Verification Checklist:**
- All unit tests pass (0 failures).
- A complete local game works from home screen to game over.
- A complete online multiplayer game works across multiple tabs/devices.
- No console errors in the browser during normal gameplay.
- The production build runs successfully in Docker.
- The README explains the project to a new developer clearly.

---

## Phase 7: v1.1 Feature Additions

> These prompts cover features added after the initial v1.0 release. Each builds on the completed Phase 1–6 codebase.

### Prompt 7.1 — AI Opponent Engine

```
Add AI player support so the game can be played solo against computer opponents.

1. Create src/app/utils/aiPlayer.ts (client-side, used in local/offline mode only):

   class AIPlayer with constructor(difficulty: 'easy' | 'medium' | 'hard')
   
   Main method: selectCard(hand: Card[], gameState: GameState, playerIndex: number): Card
   Returns the card the AI will play. Must respect canPlayCard() — only return legal cards.

   Strategy levels:
   - Easy: Random selection among legal cards, 30% chance to prefer the lowest card.
   - Medium: Follow suit correctly. Try to win tricks that contain mindis. Play low when a teammate is currently winning the trick. Otherwise play lowest legal card.
   - Hard: Full tactical play — track team mindi totals, lead high cards in late game (trick > 10), give mindis to a winning teammate, only trump in if the trick has mindi value or it's late game.

2. In SetupScreen (the game setup form), allow each non-human seat to be toggled between Human and AI with an Easy/Medium/Hard difficulty selector.

3. AI player default names: Use authentic Indian names instead of generic "AI Player N":
   Seat 1 → Arjun, Seat 2 → Priya, Seat 3 → Vikram, Seat 4 → Kavita,
   Seat 5 → Rahul, Seat 6 → Deepa, Seat 7 → Amit, Seat 8 → Sunita,
   Seat 9 → Ravi. Names are editable by the user.

4. In App.tsx (or the game controller), after each state update during local mode:
   - Check if the current turn is an AI seat.
   - After a 600–1400ms simulated think delay (Math.random() * 800 + 600), call AIPlayer.selectCard() and automatically play the chosen card.
   - Do not allow the human player to interact while an AI is "thinking."

5. Quick Play shortcut on the home screen: instantly starts a 4-player game (1 human + 3 AI at Medium difficulty) using the Cut Hukum trump method and a 5-point target, with Indian names pre-assigned.

6. The human player's name is configurable via a name input field in the setup screen's seat-0 card. Leave blank to default to "You".
```

### Prompt 7.2 — Duplicate Card Rule (Multi-Deck)

```
Enforce the correct rule for identical cards appearing in multi-deck games.

In server/src/engine/trickResolver.ts, update the cardBeats() function:
When two cards have the same suit AND the same rank, the LATER-played card wins.
Implement this by changing the same-suit rank comparison from strict greater-than (>) to
greater-than-or-equal (>=):

  // Before:
  if (a.suit === b.suit) return getRankValue(a.rank) > getRankValue(b.rank);
  
  // After (last player wins on tie):
  if (a.suit === b.suit) return getRankValue(a.rank) >= getRankValue(b.rank);

Apply the same change in:
- The client-side trick resolution in App.tsx (the inline trick evaluation loop that uses beats = getRankValue(c.rank) > getRankValue(winCard.rank))
- The AIPlayer.cardBeats() helper method in aiPlayer.ts

Also add a test case in trickResolver.test.ts:
"When two players play the same card (same suit, same rank), the player who played later wins."
```

### Prompt 7.3 — Lobby Identity: "(You)" Badge

```
Ensure players can identify their own seat in the lobby.

In LobbyScreen.tsx:
1. Add a mySeatIndex: number prop (passed from App.tsx which knows the current player's seat).
2. In the player list rendering, for the entry whose seatIndex === mySeatIndex, add a small "(You)" badge beside the player's name. Style it distinctively (e.g., gold border, small text).
3. All players — including the host — display their actual entered name. Never render another player's name as "You".
4. The host entry still shows a crown icon. If the current viewer is also the host, they see both the crown and the "(You)" badge on their own entry.

In App.tsx, pass mySeatIndex={mySeatIndex} to LobbyScreen in all rendering paths (online mode and local mode).

In SetupScreen.tsx, the host name field (seat 0) must accept freeform input. Change the default player name for seat 0 from the hardcoded string "You" to a configurable input field with placeholder "Your name (optional)". If left blank, resolve to "You" locally but do NOT send "You" as the name to the server in online mode — require a name for online play.
```

### Prompt 7.4 — Game Over Screen: Team Member Breakdown

```
Enhance the Game Over screen to show per-team player names alongside round statistics.

Update GameOverProps in GameOver.tsx to add:
  players: { name: string; teamId: 0 | 1 }[]
  teamMindis: [number, number]   // from gameState.round.teamMindis (last round)
  teamTricks: [number, number]   // from gameState.round.teamTricks (last round)

In the Game Over screen UI, replace the simple "Team A / Team B" score cards with an expanded layout:
- Each team column lists the names of that team's members (filter players by teamId).
- Below the names, show: "Hath: X  ·  Mindi: Y" using teamTricks[t] and teamMindis[t].
- The winning team's column is visually highlighted (glow border, slightly brighter background).
- The final game points score (cumulative) is still shown prominently.

In App.tsx, pass the new props when rendering GameOver:
  players={gameState.players.map(p => ({ name: p.name, teamId: p.teamId }))}
  teamMindis={gameState.round.teamMindis}
  teamTricks={gameState.round.teamTricks}
```

### Prompt 7.5 — Responsive Game Table & Card Corner Fix

```
Make the game table fill the available screen and fix card corner clipping in the hand.

1. Responsive TrickArea:

   In TrickArea.tsx, add a size?: number prop (default 400).
   Inside the component, compute a scale ratio: const r = size / 380
   Scale all pixel values by r:
     - card placement radius: Math.round(90 * r)
     - outer decorative ring diameter: Math.round(280 * r)
     - inner felt circle diameter: Math.round(180 * r)
     - seat indicator distance from center: Math.round(162 * r)
   Set the container div's width and height to size × size.

2. In GameTable.tsx, calculate the table size responsively:

   const tableSize = useMemo(() => {
     if (typeof window === 'undefined') return 400;
     return Math.floor(Math.min(
       window.innerWidth - 8,          // nearly full screen width
       (window.innerHeight - 310) * 0.95, // 95% of available vertical space
       540                              // maximum cap
     ));
   }, []);
   
   Pass size={tableSize} to TrickArea.

3. Fix card hand corner clipping:

   The player hand container uses overflow-x: auto which also clips rotated card corners
   in the Y axis. Fix by increasing the inner card container height from 130px to 165px.
   
   With md-size cards (118px tall) fanned at up to 22° rotation with translateY(-10.5px):
   - Unrotated card top: 165 - 118 = 47px from container top
   - Rotated corner (22°, calculated): ~40px from container top
   - With translateY offset: ~30px — safely within the 165px container, no clipping.
   
   Change:
     <div ... style={{ width: totalHandWidth, height: 130 }}>
   To:
     <div ... style={{ width: totalHandWidth, height: 165 }}>
```

**Verification Checklist after Phase 7:**
- In a 4-player game with all AI opponents, the game runs automatically from start to finish without human input.
- AI players respect follow-suit rules — they never play an off-suit card when they hold the led suit.
- When two players play the same card (test with a 2+ deck game), the later-played card wins the trick.
- In the lobby, the current player's entry shows a "(You)" badge; other players show their actual names.
- The Game Over screen lists team member names with hath and mindi counts from the last round.
- On a phone (375px wide), the game table fills the available width and height without overflow.
- Player hand cards display fully without any corners being cut off, even at maximum fan rotation.

---

## Appendix A: Filler Card Quick Reference

When Claude Code asks about filler cards during development, refer to this table:

| Players | Decks | Active Cards | Cards Needed | Shortfall | Filler Set |
|---------|-------|-------------|-------------|-----------|------------|
| 4 | 2 | 56 | 60 | 4 | 7♥ 7♦ 7♠ 7♣ |
| 6 | 3 | 84 | 90 | 6 | 2♥ 7♥ 7♦ 2♠ 7♠ 7♣ |
| 8 | 4 | 112 | 120 | 8 | 2♥ 7♥ 2♦ 7♦ 2♠ 7♠ 2♣ 7♣ |
| 10 | 5 | 140 | 150 | 10 | 2♥ 7♥ 2♦ 7♦ 2♠ 7♠ 2♣ 7♣ 3♥ 3♦ |

---

## Appendix B: Mindi (10s) Count Per Configuration

| Players | Decks | Total Mindis | Team Needs to Win |
|---------|-------|-------------|-------------------|
| 4 | 2 | 8 | 5 or more |
| 6 | 3 | 12 | 7 or more |
| 8 | 4 | 16 | 9 or more |
| 10 | 5 | 20 | 11 or more |

---

## Appendix C: Dealer Rotation Logic

```
If dealer's team WINS the round:
  → Deal passes to the right (next seat anticlockwise) — new dealer is from losing team

If dealer's team LOSES the round normally:
  → Same dealer deals again

If dealer's team LOSES by WHITEWASH (0 tricks won):
  → Deal passes to dealer's partner (still losing team, but different player)
```

---

## Appendix D: Trump Method Summary for Developers

| Method | When Trump is Known | Who Sets It | Special Rules |
|--------|--------------------|-----------|-|
| Random | Before first trick | System (random draw) | None |
| Band Hukum A | When first player can't follow suit | Player to dealer's right (secretly) | Revealed automatically; player who can't follow may play any card |
| Band Hukum B | When a player *requests* reveal | Player to dealer's right (secretly) | Requester must play trump; pre-reveal trump-suit cards don't count as trump |
| Cut Hukum | When first player plays off-suit | First player who can't follow | The off-suit card played sets the trump for the rest of the round |

---

*Document ends. Version 1.0 — April 2026.*
