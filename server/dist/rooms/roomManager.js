"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRoom = createRoom;
exports.joinRoom = joinRoom;
exports.leaveRoom = leaveRoom;
exports.getRoom = getRoom;
exports.getRoomBySocket = getRoomBySocket;
exports.getLobbyPlayers = getLobbyPlayers;
exports.startGame = startGame;
exports.startNextRound = startNextRound;
exports.cleanupStaleRooms = cleanupStaleRooms;
const gameEngine_1 = require("../engine/gameEngine");
const rooms = new Map();
function generateCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++)
        code += chars[Math.floor(Math.random() * chars.length)];
    return rooms.has(code) ? generateCode() : code;
}
/** Create a new lobby room. Returns the room code. */
function createRoom(hostSocketId, hostName, playerCount, trumpMethod, gamePointsTarget) {
    const code = generateCode();
    const seats = Array(playerCount).fill(null);
    seats[0] = { socketId: hostSocketId, name: hostName, seatIndex: 0, teamId: 0 };
    const room = {
        code,
        hostSocketId,
        playerCount,
        trumpMethod,
        gamePointsTarget,
        seats,
        gameState: null,
        phase: 'lobby',
        createdAt: Date.now()
    };
    rooms.set(code, room);
    return room;
}
/** Join an existing lobby room. Returns the assigned seatIndex or error. */
function joinRoom(socketId, name, code) {
    const room = rooms.get(code.toUpperCase());
    if (!room)
        return { error: 'Room not found' };
    if (room.phase !== 'lobby')
        return { error: 'Game already started' };
    const nextSeat = room.seats.findIndex(s => s === null);
    if (nextSeat === -1)
        return { error: 'Room is full' };
    const seat = {
        socketId,
        name,
        seatIndex: nextSeat,
        teamId: (nextSeat % 2)
    };
    room.seats[nextSeat] = seat;
    return { seat, room };
}
/** Remove a player from their room (disconnect handling). */
function leaveRoom(socketId) {
    for (const room of rooms.values()) {
        const idx = room.seats.findIndex(s => s?.socketId === socketId);
        if (idx !== -1) {
            room.seats[idx] = null;
            // Clean up empty rooms
            if (room.seats.every(s => s === null))
                rooms.delete(room.code);
            return { room, seatIndex: idx };
        }
    }
    return null;
}
function getRoom(code) {
    return rooms.get(code.toUpperCase());
}
function getRoomBySocket(socketId) {
    for (const room of rooms.values()) {
        if (room.seats.some(s => s?.socketId === socketId))
            return room;
    }
    return undefined;
}
/** Lobby snapshot: public player list (no hands). */
function getLobbyPlayers(room) {
    return room.seats
        .filter((s) => s !== null)
        .map(s => ({ name: s.name, seatIndex: s.seatIndex, teamId: s.teamId, connected: true }));
}
/** Start the game. Fails if not all seats filled or already started. */
function startGame(room) {
    if (room.phase !== 'lobby')
        return { error: 'Already started' };
    if (room.seats.some(s => s === null))
        return { error: 'Not all players joined' };
    const seats = room.seats;
    const state = (0, gameEngine_1.initGame)(room.code, seats.map(s => s.name), seats.map(s => s.socketId), {
        playerCount: room.playerCount,
        trumpMethod: room.trumpMethod,
        gamePointsTarget: room.gamePointsTarget
    });
    room.gameState = state;
    room.phase = 'playing';
    return state;
}
/** Start next round with proper dealer rotation (PRD §12). */
function startNextRound(room, winnerTeamId, category) {
    if (!room.gameState)
        return { error: 'No game state' };
    const prev = room.gameState;
    const seats = room.seats;
    const prevDealer = prev.round.dealerSeatIndex;
    const dealerTeam = prev.players[prevDealer].teamId;
    const newDealer = (0, gameEngine_1.nextDealerSeat)(prevDealer, dealerTeam, winnerTeamId, category, room.playerCount);
    const newState = (0, gameEngine_1.initGame)(room.code, seats.map(s => s.name), seats.map(s => s.socketId), {
        playerCount: room.playerCount,
        trumpMethod: room.trumpMethod,
        gamePointsTarget: room.gamePointsTarget
    }, newDealer, [...prev.gamePoints]);
    room.gameState = newState;
    room.phase = 'playing';
    return newState;
}
/** Expire rooms older than 30 minutes with no active game (PRD §14.3). */
function cleanupStaleRooms() {
    const cutoff = Date.now() - 30 * 60 * 1000;
    for (const [code, room] of rooms.entries()) {
        if (room.phase === 'lobby' && room.createdAt < cutoff)
            rooms.delete(code);
    }
}
