# Mindi (Mendikot) Web Game — Product Requirements Document

**Version:** 1.1  
**Date:** April 2026  
**Variant:** Gujarat Rules — Multi-Player, Multi-Deck Edition  
**Prepared for:** Claude Code Development

---

## Table of Contents

1. Executive Summary
2. Product Vision & Goals
3. Game Concept & Cultural Context
4. Player & Deck Configuration
5. Card Composition System (with Filler Logic)
6. Game Setup Flow
7. Core Gameplay Rules
8. Trump System (Hukum)
9. Trick-Taking Mechanics
10. Filler Card Rules
11. Scoring System
12. Dealer Rotation Rules
13. Game Modes
14. Room & Lobby System (Multiplayer)
15. UI/UX Requirements
16. Technical Architecture
17. Data Models & State
18. WebSocket Event Reference
19. Edge Cases & Error Handling
20. Non-Functional Requirements

---

## 1. Executive Summary

Mindi (also written Mendikot or Mindikot) is the flagship card game of Gujarat, India. This document specifies a web-based, real-time multiplayer implementation that faithfully follows Gujarat rules while scaling the game from 4 to 10 players using a custom multi-deck, 15-card-hand system invented by the product owner. The product supports both a local mode (all players on the same device, passing the screen) and an online multiplayer mode where players join a shared room using a short invite code.

The single most important design decision is the **card composition system**: instead of using full decks, the game strips all cards below rank 8 from every deck (keeping only 8, 9, 10, J, Q, K, A — seven ranks per suit, 28 cards per deck), then adds a precisely calculated set of low-ranked "filler cards" (7s and 2s) to bring the total to an exact multiple of 15 so each player receives 15 cards. These filler cards cannot win tricks but can be played to follow suit or discard.

---

## 2. Product Vision & Goals

The primary goal is to create an authentic digital Mindi experience for Gujarati players and their families, playable across devices in a browser with zero installation required.

**Primary Goals:**
- Deliver a rules-accurate Gujarat-variant Mindi game playable by 4, 6, 8, or 10 players.
- Support both local (same-screen pass-and-play) and online multiplayer (room-code join).
- Make the filler card system transparent and explainable to players inside the UI.
- Keep the UI clean, mobile-friendly, and fast even on low-bandwidth connections.

**Non-Goals (out of scope for v1.0):**
- Betting or wagering mechanics.
- Persistent user accounts or global leaderboards.
- Native mobile app (iOS/Android); the web app should be mobile-responsive.

**Implemented beyond v1.0 scope (added in v1.1):**
- AI / computer opponents (Easy, Medium, Hard difficulty) — fully implemented for local/offline play.

---

## 3. Game Concept & Cultural Context

Mindi is a **partnership trick-taking card game** rooted in Gujarat. The name derives from the Gujarati word **મીંડું (mindum)** meaning "zero," which refers to the 10 card (the only playing card displaying a zero digit). The suffix "kot" is a South Asian term for a shutout — winning so decisively that the opponents score nothing. Together, "mendikot" means capturing all tens in a hand.

The game is played by two teams in anticlockwise direction. The sole scoring objective is capturing **10-rank cards (called "mindi")**. Suits are equal in status except for the trump suit (called **hukum**), which beats all other suits. Players must follow the led suit if they can; if they cannot, they may play any card including trump.

The Gujarat-specific rule set implemented here follows:
- Anticlockwise deal and play.
- Three trump selection methods: random draw, band hukum (closed trump), cut hukum.
- 10-capture-based scoring (majority of tens wins; 50-50 tens is broken by trick majority).
- Dealer stays with the losing team; dealer rotation follows the losing/winning convention.
- All 15 tricks constitute one round (not 13 as in standard 4-player Mindi).

---

## 4. Player & Deck Configuration

### 4.1 Allowed Player Counts

The game supports even-numbered player counts only, as players form two equal teams. The minimum is 4 players (minimum 2 decks) and the maximum is 10 players.

| Players | Teams | Players per Team | Decks Used |
|---------|-------|-----------------|------------|
| 4       | 2     | 2               | 2          |
| 6       | 2     | 3               | 3          |
| 8       | 2     | 4               | 4          |
| 10      | 2     | 5               | 5          |

### 4.2 Team Seating

Teams alternate around the table so that each player is flanked by opponents. For 4 players (seats 0–3): Team A sits at seats 0 and 2; Team B sits at seats 1 and 3. For 6 players (seats 0–5): Team A sits at seats 0, 2, 4; Team B at seats 1, 3, 5. This pattern extends identically to 8 and 10 players. Partners are never adjacent; they are always separated by an opponent.

### 4.3 Cards Per Hand

Every player, regardless of player count, receives **15 cards** at the start of each round.

---

## 5. Card Composition System (Filler Logic)

This is the most critical and novel part of the system. Understanding it fully is required before implementing any game logic.

### 5.1 Active Cards (Base Deck)

From each standard 52-card deck, only cards of rank 8 or above are used as **active cards**. Cards below rank 8 (2, 3, 4, 5, 6) are entirely discarded from each deck before assembly. The rank 7 is partially used — see the filler section below.

The active cards per deck are: **8, 9, 10, J, Q, K, A** across all 4 suits.
That is 7 ranks × 4 suits = **28 active cards per deck**.

### 5.2 Why Fillers Are Needed

With N players each needing 15 cards, the total cards required is N × 15. However, the total active cards available is (decks × 28). These two numbers never match perfectly:

| Players | Decks | Active Cards (decks × 28) | Cards Needed (players × 15) | Shortfall |
|---------|-------|--------------------------|----------------------------|-----------|
| 4       | 2     | 56                       | 60                         | **4**     |
| 6       | 3     | 84                       | 90                         | **6**     |
| 8       | 4     | 112                      | 120                        | **8**     |
| 10      | 5     | 140                      | 150                        | **10**    |

The shortfall is filled by adding specific low-ranked cards drawn from the same decks being used. These low-ranked cards are called **filler cards**.

### 5.3 Filler Card Sets by Player Count

Filler cards are drawn from one of the base decks (deck 1) and are always low-ranked cards (rank 7 or rank 2). They are distinguishable from active cards by rank. The exact filler sets for each configuration are defined as follows:

**4 Players — Shortfall 4:**
Add one 7 from each suit: 7♥, 7♦, 7♠, 7♣.

**6 Players — Shortfall 6 (owner-specified):**
Add: 2♥, 7♥, 7♦, 2♠, 7♠, 7♣.

**8 Players — Shortfall 8:**
Add: 2♥, 7♥, 2♦, 7♦, 2♠, 7♠, 2♣, 7♣.

**10 Players — Shortfall 10:**
Add: 2♥, 7♥, 2♦, 7♦, 2♠, 7♠, 2♣, 7♣, 3♥, 3♦.

The filler cards should be treated as cards from the same pool — their suit membership is real (a 7♥ belongs to hearts), but their rank places them at the absolute bottom of the suit hierarchy.

### 5.4 Complete Card Rank Hierarchy

Within any suit, cards rank from highest to lowest as follows:

**A > K > Q > J > 10 > 9 > 8 > [filler: 7 > 2 > 3]**

Rank 8 is the lowest active card. Any filler card (7, 2, 3) is weaker than rank 8, making it impossible for a filler card to beat an active card in a trick. Among filler cards of the same suit, 7 beats 2, which beats 3.

### 5.5 Total Cards Verification

After adding fillers, the total must equal players × 15:

| Players | Active | Fillers | Total | ÷ Players | = 15? |
|---------|--------|---------|-------|-----------|-------|
| 4       | 56     | 4       | 60    | ÷ 4       | ✓ 15  |
| 6       | 84     | 6       | 90    | ÷ 6       | ✓ 15  |
| 8       | 112    | 8       | 120   | ÷ 8       | ✓ 15  |
| 10      | 140    | 10      | 150   | ÷ 10      | ✓ 15  |

### 5.6 Total 10s (Mindis) Per Configuration

The 10-rank cards are the scoring objective. With multiple decks, the count of mindis scales:

| Players | Decks | Total 10s (Mindis) | Majority (win threshold) |
|---------|-------|-------------------|--------------------------|
| 4       | 2     | 8                 | 5 or more                |
| 6       | 3     | 12                | 7 or more                |
| 8       | 4     | 16                | 9 or more                |
| 10      | 5     | 20                | 11 or more               |

"Majority" means strictly more than half of all mindis in that configuration.

---

## 6. Game Setup Flow

### 6.1 Step-by-Step Setup

The host or local game initiator performs the following steps before a round begins:

1. **Select player count** — choose 4, 6, 8, or 10.
2. **Assign teams** — seats are numbered 0 to N-1; even seats are Team A, odd seats are Team B.
3. **Select trump method** — random draw, band hukum (closed), or cut hukum.
4. **Determine first dealer** — either randomly or by highest drawn card.
5. **Assemble the deck** — pull active cards (8–A) from the required number of decks, add the filler set for that player count, shuffle thoroughly.
6. **Deal 15 cards per player** — in three batches of 5, anticlockwise, starting from the player to the dealer's right.
7. **Execute trump selection** — depending on chosen method (see Section 8).
8. **First trick begins** — led by the player to the dealer's right.

### 6.2 Dealing Convention

- All dealing and play happen **anticlockwise**.
- The player immediately to the dealer's **right** is the first to receive cards and the first to lead a trick.
- Cards are dealt in three batches: **5 cards, then 5 cards, then 5 cards** (totaling 15).

---

## 7. Core Gameplay Rules

### 7.1 Turn Structure

Each trick proceeds as follows. The leader plays one card face-up to the center. Then, moving anticlockwise, each other player plays one card. Once all players have contributed one card, the trick is evaluated and a winner is determined.

### 7.2 Following Suit (Obligation)

A player **must** play a card of the same suit as the led card if they hold at least one such card in their hand. This rule applies to both active cards and filler cards of the matching suit. If a player holds a 7♥ (filler) and hearts are led, they must play it.

### 7.3 If Unable to Follow Suit

If a player holds no card of the led suit, they may play **any card** from their hand — including a trump card, a filler card, or any other card. There is no obligation to trump when you cannot follow.

### 7.4 Trick Resolution

The trick winner is determined as follows. If one or more trump cards have been played, the highest-ranked trump card wins the trick. If no trump cards were played, the highest-ranked card of the **led suit** wins. Cards of non-led, non-trump suits never win a trick regardless of their rank.

**Duplicate Card Rule:** With multiple decks in play, it is possible for two players to play identical cards (same rank and same suit). In this case, the **last player to play that card wins** — i.e., the later-played card is considered superior. This is implemented by using a `>=` comparison (rather than `>`) when comparing same-suit cards of equal rank during trick resolution; since cards are iterated in play order, the final matching card becomes the winner.

The winner of a trick collects all played cards, adds them to their team's captured pile, and leads the next trick.

### 7.5 Filler Cards in Trick Resolution

Filler cards follow the same resolution rules as active cards. A filler card of the led suit loses to any active card of the led suit (since 7 < 8). A filler card of the trump suit is a valid trump — the lowest possible trump — and loses to any active trump. In the rare scenario where two players both play filler cards of the same suit with no active cards of that suit present, the higher-ranked filler wins (7 > 2 > 3).

---

## 8. Trump System (Hukum)

Players agree on the trump method before starting a session. All three methods produce the same outcome — a single trump suit for the round — but they differ in when and how that suit is revealed.

### 8.1 Method 1: Random / Open Trump

After shuffling, the player to the dealer's right draws one card from the top of the deck and reveals it face-up to all players. That card's suit becomes the trump suit for the round. The drawn card is returned to the deck, which is then reshuffled briefly before dealing. Trump is known to all from the start.

### 8.2 Method 2: Band Hukum (Closed / Hidden Trump)

After cards are dealt, the player to the dealer's right selects one card from their own hand and places it face-down on the table. The suit of that hidden card will be the trump suit — but no one else knows what it is yet.

There are two sub-variants of Band Hukum. Players must agree which to use:

**Band Hukum Version A:** The face-down card is automatically and immediately revealed the moment any player is unable to follow the led suit. The revealed card is returned to its owner's hand. The player who could not follow suit is free to play any card — there is no compulsion to play a trump.

**Band Hukum Version B:** A player who cannot follow suit has the *option* to request the trump card be revealed before playing, but is not required to do so. If the trick completes without anyone requesting a reveal, there is no trump for that trick and it is won by the highest card of the led suit. When a player *does* request a reveal, the face-down card is shown, its suit becomes trump from that moment forward, the card returns to its owner's hand, and the requesting player **must** play a trump card to that trick (unless they hold none, in which case they may play any card). Critically, any cards of the trump suit played in tricks *before* the reveal do **not** retroactively count as trumps.

### 8.3 Method 3: Cut Hukum

No trump is declared before play begins. The first time any player is unable to follow the led suit, the card they choose to play in that situation **sets the trump suit** for the entire remainder of the round. This act is called "cutting." The suit of the card played when cutting becomes hukum from that point forward.

### 8.4 Trump Visibility in UI

The UI must clearly indicate the current trump suit once it is known. If band hukum is in use and trump has not yet been revealed, the UI should show a "Trump: Hidden" indicator (not the suit). Once revealed, display the suit prominently.

---

## 9. Trick-Taking Mechanics

### 9.1 Cards Per Trick

In each trick, exactly one card is played by each player. With N players, each trick contains N cards.

### 9.2 Total Tricks Per Round

Each player holds 15 cards. Therefore, every round consists of exactly **15 tricks**.

### 9.3 Tracking 10s

The UI must track and display how many 10-rank cards (mindis) each team has captured. This is the primary game state information. After each trick, any 10s in the won cards are added to the capturing team's mindi count.

### 9.4 Trick History

Players should be able to view the most recently completed trick. A "last trick" button or area should show what was played and who won it. The full trick history for the round should also be accessible.

---

## 10. Filler Card Rules (Summary)

Filler cards follow all normal game rules with these specific characteristics:

- They are valid cards that can be played at any time a player would normally play a card of their suit.
- They rank below all active cards (rank 8 through Ace) within their suit.
- They cannot win a trick against any active card.
- They are visually marked in the UI as "filler" (e.g., slightly lighter border or a small indicator badge) so players know at a glance that these are low-utility cards.
- They belong fully to their suit — playing a 7♥ counts as following suit when hearts are led.
- They can become trump if the trump suit is their suit (they would be the lowest-valued trumps).
- They count toward the winning team's trick pile like any other card (they just do not contribute any scoring mindis since they are not 10s).

---

## 11. Scoring System

### 11.1 Round Winner Determination

At the end of each 15-trick round, compare the mindi counts of both teams. The team that captured the majority of mindis wins the round:

- 4 players (8 mindis): win by capturing 5 or more.
- 6 players (12 mindis): win by capturing 7 or more.
- 8 players (16 mindis): win by capturing 9 or more.
- 10 players (20 mindis): win by capturing 11 or more.

**Tiebreaker:** If both teams captured exactly the same number of mindis (4-4, 6-6, 8-8, or 10-10), the team that won the majority of the 15 tricks (8 or more) wins the round.

### 11.2 Win Categories

| Result | Description | Score Value |
|--------|-------------|-------------|
| Normal Win | Captured majority of mindis | 1 game point |
| Mendikot | Captured ALL mindis | 2 game points |
| Whitewash | Won ALL 15 tricks | 3 game points |

A Mendikot is considered a prestigious, superior victory. A Whitewash (winning every single trick) is the ultimate achievement.

### 11.3 Game Length

The first team to reach **5 game points** wins the overall game (also called a "match"). This threshold can be configured by the host before the game starts (options: 3, 5, 7, or 10 points).

### 11.4 Score Display

The UI must show a persistent scoreboard visible during play showing each team's current game-point total, the number of mindis each team has captured in the current round, and the number of tricks each team has won in the current round.

---

## 12. Dealer Rotation Rules

### 12.1 First Dealer

The first dealer is chosen by a random draw from the shuffled deck. The player who draws the highest card becomes the first dealer. In case of a tie in rank, the player with the higher-suited card wins (suit order for tiebreaking only: Spades > Hearts > Diamonds > Clubs). These drawn cards are returned to the deck before dealing.

### 12.2 Subsequent Deals

The core principle is: **the dealer must always be a member of the losing team from the previous round.**

If the dealer's team **loses** the round, the same player continues as dealer for the next round.

If the dealer's team loses by **Whitewash** (all 15 tricks taken), the deal passes to the dealer's **partner** (another member of the losing team) as an additional penalty.

If the dealer's team **wins** the round, the deal passes one position to the **right** (anticlockwise), which is the first player of the newly-losing team.

---

## 13. Game Modes

### 13.1 Local Mode (Same Device / AI Mode)

In local mode, human players share a single browser window or tab. Any seat can be designated as a **human** or **AI** player. Human seats see their own hand; AI seats are controlled automatically by the built-in AI engine.

**AI Players:** When a seat is set to AI, the system automatically selects and plays a card after a short simulated "think time" (600–1400ms). Three difficulty levels are available:
- **Easy** — mostly random play with a slight preference for low cards.
- **Medium** — follows suit correctly, tries to win tricks with mindis, plays low when teammate is winning.
- **Hard** — full tactical play: tracks mindi totals, leads high in late game, gives mindis to winning teammate.

**Default AI Names:** AI player slots are pre-filled with authentic Indian names to enhance immersion: Arjun, Priya, Vikram, Kavita, Rahul, Deepa, Amit, Sunita, Ravi, Meena (in seat order).

When all non-human seats are AI, there is no pass-device flow — the game runs continuously. The human player's name is configurable via a name input on the setup screen (defaults to "You" if left blank).

Local mode supports 4, 6, 8, or 10 players. All game logic runs client-side in this mode with no server required.

### 13.2 Online Multiplayer Mode

In online mode, each player uses their own device. One player acts as the host and creates a room, receiving a **6-character alphanumeric room code** (e.g., "MINDI7"). Other players enter this code to join the room.

The host configures: player count (4/6/8/10), trump method, game length (points to win), and player names/seat assignments. Once the correct number of players have joined, the host clicks "Start Game."

Real-time synchronization uses **WebSockets** (Socket.io). Each player only sees their own hand on their device. The game table (center area showing played cards, trick count, scoreboard) is visible to all.

### 13.3 Spectator Mode (Future)

Not required for v1.0, but the architecture should not preclude adding it. Spectators would join a room without claiming a seat and observe all play without seeing any player's private hand.

---

## 14. Room & Lobby System (Multiplayer)

### 14.1 Room Creation Flow

1. Player navigates to the home screen and selects "Create Game."
2. They enter their name, select player count, select trump method, and set game points target.
3. A room code is generated and displayed prominently.
4. The host's lobby screen shows a waiting list of joined players.
5. As players join, their names appear in the lobby in real-time.
6. When the required number of players have joined, the "Start Game" button activates.
7. The host clicks "Start Game" to begin.

### 14.2 Room Joining Flow

1. Player navigates to home screen and selects "Join Game."
2. They enter their name and the 6-character room code.
3. If the code is valid and the room is not yet full/started, they are added to the lobby.
4. They see the lobby screen listing all joined players and current settings.
5. Game starts when the host initiates it.

### 14.3 Room Constraints

- A room code is valid only while the game has not started and is not full.
- Once a game starts, new joins are not accepted (no reconnection in v1.0).
- Room codes expire 30 minutes after creation if the game never starts.
- A single server should support at least 50 concurrent rooms.

### 14.4 Seat Assignment

After all players have joined and before the host clicks "Start Game," the system randomly assigns seats (0 to N-1). Even-numbered seats are Team A; odd-numbered seats are Team B. The host may optionally re-randomize seating.

---

## 15. UI/UX Requirements

### 15.1 Screen Inventory

**Home Screen:** Title "Mindi," two large buttons ("Create Game" and "Join Game"), brief one-line explanation of the game.

**Create Game Screen:** Input fields for host name, player count selector (4/6/8/10), trump method selector (Random / Band Hukum A / Band Hukum B / Cut Hukum), game points selector (3/5/7/10), then a "Create Room" button.

**Join Game Screen:** Input field for player name, input field for room code, "Join" button.

**Lobby Screen:** Displays room code prominently, lists joined players with their seat number and team color, shows game settings summary, shows "Waiting for X more players" or "Start Game" button (host only). Each player entry shows the player's actual name. The current user's own entry is additionally tagged with a "(You)" badge so they can identify themselves at a glance — this is especially important for players who just joined and need to confirm their seat. The host is indicated by a crown icon. Because all players enter their real names on join, the admin (host) name is never shown as "You" to other players.

**Game Table Screen:** The primary game screen. Components described in 15.2.

**Round Result Screen:** Shown after all 15 tricks are played, displaying which team won, the win category (Normal/Mendikot/Whitewash), updated game point scores, and a "Next Round" button (host only in online mode).

**Game Over Screen:** Displayed when a team reaches the game point target. Shows the winning team, final cumulative game-point scores, and — critically — breaks down each team's members by name alongside the team's **hath (tricks)** and **mindi** counts from the final round. This allows players to see at a glance who was on which team and how the decisive round played out. Buttons: "Play Again" (returns to setup) and "Home."

### 15.2 Game Table Layout

The game table is the most complex screen. It must contain the following areas:

**Center Table Area:** Shows the cards currently played in the active trick. Each card appears in the position corresponding to the player who played it (roughly around a circular/oval table layout). The most recently played card is highlighted. When a trick is won, a brief animation shows the cards flying to the winner's direction before disappearing.

The table area must be **responsive**: it should scale to fill the available screen space between the top status bar and the player's hand area. The diameter of the table circle is calculated as `min(screenWidth - 8px, availableHeight × 0.95, 540px)` so it fills as much of the viewport as possible without overflowing. On large screens (tablets, desktops) the table can reach up to 540px in diameter; on narrow phones it scales down to fit the screen width. All internal elements (card positions, ring sizes, seat indicators) scale proportionally.

**Trump Indicator:** Clearly visible at all times once trump is known. Shows suit symbol and name (e.g., "♠ Spades — Trump"). If trump is hidden (band hukum unrevealed), shows "Trump: Hidden."

**Scoreboard Panel:** Shows game points per team, mindis captured per team in the current round, and tricks won per team in the current round.

**Player Hand Area:** The current player's cards displayed in a fan layout at the bottom of the screen. Playable cards are highlighted; non-playable cards (if the player must follow suit but has that suit) are slightly dimmed. Filler cards have a subtle visual indicator.

**Other Players' Areas:** For opponents and partners not currently taking their turn, show a card-back count indicator (how many cards remain in their hand) positioned around the table.

**Last Trick Button:** A small button or toggle that shows/hides a panel displaying the cards from the most recently completed trick and who won it.

**Turn Indicator:** An animated highlight or glow on the current player's area to make it obvious whose turn it is.

### 15.3 Visual Design

- Color palette: deep green table felt, cream/white card faces, team colors Red and Blue.
- Card design: Standard Western playing card faces. Suit symbols use standard Unicode (♠ ♥ ♦ ♣).
- Filler cards: Same design as active cards but with a small badge (e.g., a grey "F" or a light watermark) to distinguish them.
- Typography: Clean sans-serif font (e.g., Inter or Poppins). Gujarati script labels optional for v1.0.
- Responsive layout: Must work on mobile screens (360px wide minimum) and desktop. On mobile, the player's hand cards scroll horizontally if they don't fit.
- Hand card container must have sufficient height (≥ 165px) to accommodate rotated card corners without clipping. Cards are positioned from the bottom of the container and fanned with rotation up to 22°; the container height must account for the geometric displacement of rotated corners at maximum fan angle.

### 15.4 Accessibility

- All interactive elements must be keyboard-navigable.
- Card colors must not rely on color alone — suit symbols are textual (♠ ♥ ♦ ♣).
- Font sizes must be legible at 16px minimum for card face labels.

---

## 16. Technical Architecture

### 16.1 Stack Recommendation

**Frontend:** React (with Vite for fast development), TailwindCSS for styling, Socket.io-client for real-time events.

**Backend (for multiplayer):** Node.js with Express for REST API (room creation, join), Socket.io for real-time game events. All authoritative game logic must live server-side to prevent cheating.

**State Management:** Zustand or React Context for client-side game state. Server holds the authoritative state.

**No database required for v1.0.** All room and game state is held in memory on the server. If the server restarts, active games are lost (acceptable for v1.0).

### 16.2 Local Mode Architecture

In local mode, the entire game engine runs in the browser with no server communication. The React component tree manages game state using a reducer pattern. The local game engine module must be identical to the server-side game engine module (shared logic, possibly extracted as a pure JavaScript module used by both).

### 16.3 Multiplayer Architecture

```
[Player Browser A] ---WebSocket---> [Node.js Server]
[Player Browser B] ---WebSocket---> [Node.js Server]
[Player Browser C] ---WebSocket---> [Node.js Server]
                                         |
                                   [Room Manager]
                                         |
                                   [Game Engine]
                                   (authoritative)
```

The server is the single source of truth. Clients send actions (e.g., "play card X") and receive state updates. Clients never calculate game outcomes themselves in multiplayer mode — they only render the state they receive.

### 16.4 Project Structure

```
/mindi-game
  /client                  — React frontend
    /src
      /components          — UI components (Card, Table, Hand, Scoreboard, etc.)
      /screens             — Full-page screen components
      /engine              — Shared game logic (also used by server)
      /store               — Zustand state stores
      /hooks               — Custom React hooks
      /utils               — Helpers (deck builder, card rank comparator, etc.)
  /server                  — Node.js backend
    /rooms                 — Room manager (create, join, close rooms)
    /game                  — Game state manager and action handlers
    /socket                — Socket.io event handlers
    server.js              — Entry point
  /shared                  — Code shared between client and server
    /engine                — Core game logic (deck builder, trick resolver, scorer)
    /types                 — TypeScript interfaces/types
```

---

## 17. Data Models & State

### 17.1 Card Object

```typescript
interface Card {
  suit: 'hearts' | 'diamonds' | 'spades' | 'clubs';
  rank: 'A' | 'K' | 'Q' | 'J' | '10' | '9' | '8' | '7' | '2' | '3';
  isFiller: boolean;       // true if rank is 7, 2, or 3
  deckIndex: number;       // which deck this card came from (0, 1, 2...)
  id: string;              // unique ID: e.g., "hearts_10_deck0"
}
```

### 17.2 Player Object

```typescript
interface Player {
  id: string;             // socket ID in multiplayer, sequential in local
  name: string;
  seatIndex: number;      // 0 to N-1
  teamId: 0 | 1;          // Team A = 0, Team B = 1
  hand: Card[];           // current hand (only sent to that player in multiplayer)
  cardCount: number;      // visible to all — how many cards remain
}
```

### 17.3 GameConfig Object

```typescript
interface GameConfig {
  playerCount: 4 | 6 | 8 | 10;
  deckCount: 2 | 3 | 4 | 5;
  trumpMethod: 'random' | 'band_hukum_a' | 'band_hukum_b' | 'cut_hukum';
  gamePointsTarget: 3 | 5 | 7 | 10;
  totalMindis: 8 | 12 | 16 | 20;
  mindiMajority: 5 | 7 | 9 | 11;
  fillerCards: Card[];    // the exact filler set for this config
}
```

### 17.4 RoundState Object

```typescript
interface RoundState {
  dealerSeatIndex: number;
  currentLeaderSeatIndex: number;
  currentTurnSeatIndex: number;
  trumpSuit: Suit | null;          // null if not yet revealed
  trumpCard: Card | null;          // the band hukum face-down card (server only)
  trumpRevealed: boolean;
  currentTrick: {
    cards: { seatIndex: number; card: Card }[];
    ledSuit: Suit | null;
  };
  completedTricks: CompletedTrick[];
  teamMindis: [number, number];    // [Team A count, Team B count]
  teamTricks: [number, number];    // [Team A tricks, Team B tricks]
  trickNumber: number;             // 1 to 15
}
```

### 17.5 GameState Object

```typescript
interface GameState {
  roomCode: string;
  config: GameConfig;
  players: Player[];
  round: RoundState;
  gamePoints: [number, number];    // [Team A, Team B]
  phase: 'lobby' | 'playing' | 'round_end' | 'game_over';
  winner: 0 | 1 | null;
}
```

---

## 18. WebSocket Event Reference

### 18.1 Client → Server Events

| Event | Payload | Description |
|-------|---------|-------------|
| `join_room` | `{ roomCode, playerName }` | Join an existing room |
| `create_room` | `{ playerName, config }` | Create a new room |
| `start_game` | `{ roomCode }` | Host starts the game (all seats filled) |
| `play_card` | `{ roomCode, cardId }` | Player plays a card from their hand |
| `request_trump_reveal` | `{ roomCode }` | Band Hukum B: player requests trump reveal |
| `next_round` | `{ roomCode }` | Host triggers start of next round |
| `rematch` | `{ roomCode }` | All players agree to a rematch |

### 18.2 Server → Client Events

| Event | Payload | Description |
|-------|---------|-------------|
| `room_joined` | `{ gameState, yourSeat }` | Sent to a player after joining |
| `player_joined` | `{ playerName, seatIndex }` | Broadcast to all when a new player joins |
| `game_started` | `{ gameState, yourHand }` | Sent to each player with their private hand |
| `card_played` | `{ seatIndex, card, trickState }` | Broadcast after each card play |
| `trick_complete` | `{ winnerSeat, cards, teamMindis, teamTricks }` | After trick resolves |
| `trump_revealed` | `{ trumpSuit }` | When band hukum trump becomes known |
| `round_complete` | `{ result, gamePoints }` | After all 15 tricks |
| `game_over` | `{ winnerTeam, finalScores }` | When a team reaches the target |
| `error` | `{ code, message }` | Error feedback (invalid move, full room, etc.) |

---

## 19. Edge Cases & Error Handling

### 19.1 Invalid Card Play

If a player attempts to play a card they should not (not in hand, must follow suit but played off-suit with valid suit in hand), the server rejects the action and sends an `error` event back to only that player. The game state is unchanged. The client re-highlights valid cards.

### 19.2 Player Disconnection in Multiplayer

If a player disconnects during a game, the server pauses that player's turn for up to 60 seconds. A "reconnecting" indicator is shown to all other players. If the player reconnects within 60 seconds, they receive the full current game state and their hand. If they do not reconnect in time, the round is terminated and the disconnected team forfeits the round. This is logged and the remaining players can choose to start a new round.

### 19.3 Trump Reveal Edge Case (Band Hukum B)

If trump is revealed mid-trick, any cards of that suit already played in the same trick are treated as non-trump (since they were played before the reveal). Only cards played *after* the reveal in subsequent tricks count as trump. The UI must communicate this clearly when it happens — a brief animation or notice saying "Cards played before trump reveal do not count as trump."

### 19.4 All Filler Hands

If, by statistical chance, all 15 cards dealt to a player are filler cards (extremely unlikely but theoretically possible in edge cases), that player can never win a trick against active cards. This is valid and requires no special handling — the game continues normally.

### 19.5 Simultaneous 10 Trick (Multiple Mindis in One Trick)

With multiple decks, it is possible that multiple 10s appear in a single trick. All 10s in a won trick are added to the winning team's mindi count simultaneously. The UI should indicate this with a brief "Mindi ×N!" notification when multiple mindis are captured in one trick.

---

## 20. Non-Functional Requirements

### 20.1 Performance

- Initial page load under 3 seconds on a standard 4G connection.
- Card play animations must complete within 300ms to feel responsive.
- The server should handle game events with less than 100ms latency under normal load.

### 20.2 Reliability

- The server must validate all game actions authoritatively (no client-trusted moves).
- Room state must be consistent across all connected clients at all times.

### 20.3 Browser Compatibility

- Must work on Chrome, Firefox, Safari, and Edge (latest 2 major versions).
- Must work on Android Chrome and iOS Safari for mobile play.

### 20.4 Security

- Room codes must be sufficiently random to prevent guessing (use cryptographic random generation).
- Players should not be able to see other players' hands through the WebSocket connection (each player only receives their own hand in `game_started` and hand update events).

### 20.5 Scalability (v1.0 scope)

- Target: 50 concurrent rooms, approximately 300 concurrent players.
- Single Node.js process with in-memory state is acceptable for v1.0.

---

*Document ends. Version 1.1 — April 2026.*

---

## Changelog

### v1.1 (April 2026)
- **§7.4** — Added Duplicate Card Rule: when two players play identical cards (possible in multi-deck games), the **last player's card wins** (implemented via `>=` comparison during trick resolution).
- **§2 / §13.1** — AI opponent support added (Easy/Medium/Hard). Moved from Non-Goals to implemented features. Documented AI strategy levels and Indian default AI player names.
- **§15.1 Lobby Screen** — Added "(You)" badge requirement so players can identify their own seat. Documented that host names are always real names (not "You") so other players can see the host's actual name.
- **§15.1 Game Over Screen** — Added requirement to display team member names alongside team hath (tricks) and mindi counts from the final round.
- **§15.2 Center Table Area** — Added responsive table scaling specification (scales up to 540px, fills available viewport space).
- **§15.3** — Added hand card container height requirement (≥ 165px) to prevent corner clipping of rotated cards.
