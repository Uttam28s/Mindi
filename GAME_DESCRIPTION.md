# Mindi — Complete Game Guide

## About the Game

**Mindi** (also known as **Mendikot**) is a classic partnership trick-taking card game from **Gujarat, India**. The name comes from the Gujarati word *"મીંડું"* (mindum) meaning "zero" — a nod to the 10-rank card (the only card showing a zero digit). "Kot" means a shutout or decisive win.

The game has been played for generations across Gujarati households and is beloved for its blend of strategy, teamwork, and the high-stakes hunt for **10s (Mindis)** — the only cards that matter for scoring.

---

## Players & Teams

| Players | Teams | Players per Team |
|---------|-------|-----------------|
| 4       | 2     | 2 each           |
| 6       | 2     | 3 each           |
| 8       | 2     | 4 each           |
| 10      | 2     | 5 each           |

Players sit alternately around the table — **Team A** at even seats, **Team B** at odd seats. Partners are never adjacent; they're always separated by opponents. All play and dealing move **anticlockwise**.

---

## The Cards

Mindi does **not** use a standard 52-card deck. Instead, only the following ranks are active:

> **A, K, Q, J, 10, 9, 8** (7 ranks × 4 suits = 28 cards per deck)

Low cards (2–6) are discarded. Since each player receives exactly **15 cards**, a small number of low-ranked **filler cards** (7s, 2s, 3s) are added to complete the deal.

### Card Rank Order (High → Low)
```
A > K > Q > J > 10 > 9 > 8 > 7 > 2 > 3
```
Filler cards (7, 2, 3) rank below all active cards and cannot beat them.

---

## The Goal

**Capture the majority of 10-rank cards (Mindis).** That's it. Tricks without a 10 are worthless for scoring — only tricks that contain one or more 10s matter.

| Players | Total Mindis | Need to Win |
|---------|-------------|-------------|
| 4  | 8  | 5+ |
| 6  | 12 | 7+ |
| 8  | 16 | 9+ |
| 10 | 20 | 11+ |

---

## Dealing

1. Cards are assembled (active + fillers), thoroughly shuffled, and dealt **anticlockwise** in **three batches of 5** cards each — 15 cards per player.
2. Dealing starts from the player to the **dealer's right** (who also leads the first trick).
3. The **first dealer** is chosen by drawing cards — highest card wins; ties broken by suit (Spades > Hearts > Diamonds > Clubs).

---

## Trump (Hukum)

Trump is the most strategic element of Mindi. Four methods are available:

### 1. Open Trump (Random)
A card is drawn from the top of the shuffled deck before dealing. That card's suit becomes trump for the entire round. **Trump is known to everyone from the start.**

### 2. Band Hukum A — Auto Reveal
After dealing, the first player places one card **face-down** on the table. Its suit is the secret trump. Trump is **automatically revealed** the moment any player cannot follow the led suit. The card returns to its owner's hand after reveal.

### 3. Band Hukum B — Optional Reveal
Same as Band Hukum A but the reveal is **optional**. A player who can't follow suit may choose to ask for the reveal — or play without revealing. If no reveal is requested, that trick has no trump. Cards played of the trump suit **before** the reveal are not retroactively counted as trumps.

### 4. Cut Hukum
No trump is declared before play begins. The **first card played** by any player who cannot follow the led suit **sets the trump suit** for the rest of the round. This act is called "cutting hukum."

---

## Playing a Trick

- Each player plays exactly **one card** per trick; a round has exactly **15 tricks**.
- **You must follow suit** if you hold a card of the led suit.
- If you cannot follow suit, you may play **any card** (no obligation to trump).
- **Trick winner:**
  - If any trump cards were played → highest trump wins.
  - If no trump → highest card of the led suit wins.
  - Cards of any other suit never win.
- **Duplicate card rule** (with multiple decks): if two players play the exact same card, the **last one played wins**.
- The winner of each trick leads the next one.

---

## Scoring

### Round Result

| Outcome | Condition | Points |
|---------|-----------|--------|
| **Normal Win** | Captured majority of Mindis | **1 point** |
| **Mendikot** | Captured **all** Mindis | **2 points** |
| **Whitewash (Kot)** | Won **all 15 tricks** | **3 points** |

**Tiebreaker:** If both teams captured the exact same number of Mindis, the team that won the **majority of tricks** (8 or more) wins the round for 1 point.

### Game Length

First team to reach the target score wins the game. Choose from: **3, 5, 7, or 10 points** (default: 5).

---

## Dealer Rotation

After each round, the next dealer is determined by a simple rule: **the dealer must always be from the losing team.**

- Losing team's dealer stays the same → **same player deals again**.
- If the losing team was **whitewashed**, the deal passes to the losing dealer's **partner** (extra penalty).
- If the dealer's team **won**, the deal passes **one seat anticlockwise** to the first player of the newly-losing team.

---

## Game Modes

### Quick Play
One click starts a 4-player game against 3 AI opponents. Perfect for learning.

### Local / AI Game
Set up a game on a single device with any mix of human players and AI bots. Choose 4–10 players, pick a trump method, set the target score, and name your players.

### Online Multiplayer
Host creates a room and shares a **6-character room code**. Each player joins on their own device and only sees their own hand. Real-time play over WebSockets.

---

## AI Difficulty Levels

| Level | Style |
|-------|-------|
| **Easy** | Random play with slight preference for low cards |
| **Medium** | Follows suit correctly, targets Mindis, plays low when teammate is winning |
| **Hard** | Tracks Mindi counts, leads high late-game, full team coordination |

---

## Quick Reference

| Rule | Detail |
|------|--------|
| Players | 4, 6, 8, or 10 (teams of equal size) |
| Cards per player | 15 |
| Tricks per round | 15 |
| Scoring cards | 10s only (Mindis) |
| Must follow suit | Yes |
| Trump obligation | No (you may play any card when void) |
| Play direction | Anticlockwise |
| Win condition | First to reach target game points |
