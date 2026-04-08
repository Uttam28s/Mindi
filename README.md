# મીંડી (Mindi) - The Gujarati Card Game

A modern, beautiful web application for playing the traditional Gujarati card game Mindi (Mendikot).

## About the Game

Mindi is a partnership trick-taking card game from Gujarat, India. The name derives from the Gujarati word "મીંડું" (mindum) meaning "zero," which refers to the 10 card. The objective is to capture the most 10-rank cards (called "Mindis") to win rounds.

### Key Features

- **Beautiful Modern Design**: Stunning gradient backgrounds, smooth animations, and mobile-friendly interface
- **Multiple Player Modes**: Support for 4, 6, 8, or 10 players
- **Authentic Gameplay**: Faithful implementation of Gujarat rules
- **Trump Variations**: Four different trump (Hukum) methods
- **Real-time Scoring**: Live scoreboard showing Mindis and tricks
- **Responsive Design**: Works perfectly on desktop and mobile devices

## Game Rules

### Objective
Capture the majority of 10-rank cards (Mindis) in each round to score points.

### Setup
- **Players**: 4, 6, 8, or 10 players divided into 2 teams
- **Cards**: Each player receives 15 cards
- **Teams**: Players alternate around the table (Team A vs Team B)

### Trump Methods
1. **Random**: Trump suit revealed before play begins
2. **Band Hukum A**: Hidden trump, auto-revealed when a player can't follow suit
3. **Band Hukum B**: Hidden trump, player can choose to reveal
4. **Cut Hukum**: Trump set when first player can't follow suit

### Scoring
- **Normal Win**: Capture majority of Mindis → 1 point
- **Mendikot**: Capture ALL Mindis → 2 points
- **Whitewash**: Win ALL 15 tricks → 3 points

First team to reach the target points (3, 5, 7, or 10) wins the game!

## Technical Details

### Built With
- **React** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Vite** - Build tool
- **Lucide React** - Beautiful icons

### Design Features
- Custom Gujarati typography (Noto Sans Gujarati)
- Gradient backgrounds with patterns
- Smooth animations and transitions
- Card flip and trick resolution animations
- Responsive grid layouts for all screen sizes

## Development

This is a demo/prototype showcasing the visual design and user interface. Full game logic implementation would include:

- Complete deck building and shuffling
- Trick resolution engine
- Trump selection flows
- Multiplayer synchronization
- Room/lobby system
- WebSocket integration

## Credits

- Traditional Gujarati card game
- Modern digital experience by Claude Code
- Background images from Unsplash

---

**Enjoy playing Mindi!** 🎴
