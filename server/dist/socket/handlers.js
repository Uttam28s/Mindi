"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerHandlers = registerHandlers;
exports.storeRoundResult = storeRoundResult;
const roomManager_1 = require("../rooms/roomManager");
const gameEngine_1 = require("../engine/gameEngine");
/** Strip private hands — send only a player's own cards. */
function publicState(state) {
    return {
        ...state,
        players: state.players.map(({ hand: _hand, ...rest }) => rest)
    };
}
function registerHandlers(io, socket) {
    // ── Create Room ─────────────────────────────────────────────────
    socket.on('create_room', ({ playerName, playerCount, trumpMethod, gamePointsTarget, aiSlots }) => {
        try {
            const room = (0, roomManager_1.createRoom)(socket.id, playerName, playerCount, trumpMethod, gamePointsTarget, aiSlots);
            socket.join(room.code);
            socket.emit('room_created', {
                roomCode: room.code,
                seatIndex: 0,
                players: (0, roomManager_1.getLobbyPlayers)(room),
                settings: { playerCount, trumpMethod, gamePointsTarget }
            });
        }
        catch (e) {
            socket.emit('error', { code: 'CREATE_FAILED', message: String(e) });
        }
    });
    // ── Join Room ───────────────────────────────────────────────────
    socket.on('join_room', ({ roomCode, playerName }) => {
        const result = (0, roomManager_1.joinRoom)(socket.id, playerName, roomCode);
        if ('error' in result) {
            socket.emit('error', { code: 'JOIN_FAILED', message: result.error });
            return;
        }
        const { seat, room } = result;
        socket.join(room.code);
        // Tell the joining player their seat
        socket.emit('room_joined', {
            roomCode: room.code,
            seatIndex: seat.seatIndex,
            players: (0, roomManager_1.getLobbyPlayers)(room),
            settings: {
                playerCount: room.playerCount,
                trumpMethod: room.trumpMethod,
                gamePointsTarget: room.gamePointsTarget
            }
        });
        // Tell everyone else a new player joined
        socket.to(room.code).emit('player_joined', {
            name: seat.name,
            seatIndex: seat.seatIndex,
            teamId: seat.teamId,
            players: (0, roomManager_1.getLobbyPlayers)(room)
        });
    });
    // ── Rename Player (lobby only) ─────────────────────────────────
    socket.on('rename_player', ({ roomCode, newName }) => {
        const result = (0, roomManager_1.renamePlayer)(socket.id, roomCode, newName);
        if ('error' in result) {
            socket.emit('error', { code: 'RENAME_FAILED', message: result.error });
            return;
        }
        io.to(roomCode).emit('player_renamed', { players: (0, roomManager_1.getLobbyPlayers)(result.room) });
    });
    // ── Start Game (host only) ──────────────────────────────────────
    socket.on('start_game', ({ roomCode }) => {
        const room = (0, roomManager_1.getRoom)(roomCode);
        if (!room || room.hostSocketId !== socket.id) {
            socket.emit('error', { code: 'START_FAILED', message: 'Unauthorized or room not found' });
            return;
        }
        const result = (0, roomManager_1.startGame)(room);
        if ('error' in result) {
            socket.emit('error', { code: 'START_FAILED', message: result.error });
            return;
        }
        const state = result;
        broadcastRoundState(io, room, state, 'game_started');
    });
    // ── Band Hukum selection ────────────────────────────────────────
    socket.on('set_band_hukum', ({ roomCode, cardId }) => {
        const room = (0, roomManager_1.getRoom)(roomCode);
        if (!room?.gameState) {
            socket.emit('error', { code: 'NO_GAME', message: 'No active game' });
            return;
        }
        const seatIndex = room.gameState.players.findIndex(p => p.id === socket.id);
        if (seatIndex === -1) {
            socket.emit('error', { code: 'NOT_IN_GAME', message: 'Not in game' });
            return;
        }
        const { newState, error } = (0, gameEngine_1.applyBandHukum)(room.gameState, seatIndex, cardId);
        if (error) {
            socket.emit('error', { code: 'INVALID_MOVE', message: error });
            return;
        }
        room.gameState = newState;
        // Broadcast public state — trump card stays hidden
        io.to(roomCode).emit('game_state_update', { gameState: publicState(newState) });
    });
    // ── Request trump reveal (Band Hukum B) ─────────────────────────
    socket.on('request_trump_reveal', ({ roomCode }) => {
        const room = (0, roomManager_1.getRoom)(roomCode);
        if (!room?.gameState)
            return;
        const newState = (0, gameEngine_1.revealBandHukum)(room.gameState);
        room.gameState = newState;
        io.to(roomCode).emit('trump_revealed', {
            trumpSuit: newState.round.trumpSuit,
            gameState: publicState(newState)
        });
    });
    // ── Play Card ───────────────────────────────────────────────────
    socket.on('play_card', ({ roomCode, cardId }) => {
        const room = (0, roomManager_1.getRoom)(roomCode);
        if (!room?.gameState) {
            socket.emit('error', { code: 'NO_GAME', message: 'No active game' });
            return;
        }
        const seatIndex = room.gameState.players.findIndex(p => p.id === socket.id);
        if (seatIndex === -1) {
            socket.emit('error', { code: 'NOT_IN_GAME', message: 'Not in game' });
            return;
        }
        const result = (0, gameEngine_1.playCard)(room.gameState, seatIndex, cardId);
        if (result.error) {
            socket.emit('error', { code: 'INVALID_MOVE', message: result.error });
            return;
        }
        room.gameState = result.newState;
        // Broadcast public state to all players in the room
        io.to(roomCode).emit('card_played', {
            seatIndex,
            cardId,
            trickComplete: result.trickComplete,
            gameState: publicState(result.newState),
            // If trick just completed, include the resolution
            ...(result.trickComplete && {
                trickResult: {
                    winnerSeat: result.newState.round.completedTricks.at(-1)?.winnerSeatIndex,
                    mindisInTrick: result.newState.round.completedTricks.at(-1)?.mindisInTrick ?? 0,
                    teamMindis: result.newState.round.teamMindis,
                    teamTricks: result.newState.round.teamTricks
                }
            })
        });
        if (result.roundComplete && result.roundResult) {
            room.phase = result.newState.phase;
            storeRoundResult(room, result.roundResult);
            if (result.newState.phase === 'game_over') {
                io.to(roomCode).emit('game_over', {
                    winnerTeam: result.newState.winnerTeamId,
                    finalScores: result.newState.gamePoints,
                    roundResult: result.roundResult
                });
            }
            else {
                io.to(roomCode).emit('round_complete', {
                    roundResult: result.roundResult,
                    gamePoints: result.newState.gamePoints
                });
            }
        }
    });
    // ── Next Round (host only) ──────────────────────────────────────
    socket.on('next_round', ({ roomCode }) => {
        const room = (0, roomManager_1.getRoom)(roomCode);
        if (!room || room.hostSocketId !== socket.id)
            return;
        if (!room.gameState || room.phase !== 'round_end')
            return;
        // Find last round result from completed state
        const prev = room.gameState;
        const lastWinner = prev.players[0].teamId; // fallback; actual stored via round_complete event
        // We need the round result category — store it on room for next_round
        const storedResult = room._lastRoundResult;
        if (!storedResult) {
            socket.emit('error', { code: 'NO_RESULT', message: 'No round result stored' });
            return;
        }
        const newState = (0, roomManager_1.startNextRound)(room, storedResult.winnerTeamId, storedResult.category);
        if ('error' in newState) {
            socket.emit('error', { code: 'ROUND_FAILED', message: newState.error });
            return;
        }
        broadcastRoundState(io, room, newState, 'round_started');
    });
    // ── AI Play Card (host acts on behalf of AI seat) ───────────────
    socket.on('ai_play_card', ({ roomCode, seatIndex, cardId }) => {
        const room = (0, roomManager_1.getRoom)(roomCode);
        if (!room?.gameState) {
            socket.emit('error', { code: 'NO_GAME', message: 'No active game' });
            return;
        }
        if (room.hostSocketId !== socket.id) {
            socket.emit('error', { code: 'UNAUTHORIZED', message: 'Only host can play for AI' });
            return;
        }
        const seat = room.seats[seatIndex];
        if (!seat?.isAI) {
            socket.emit('error', { code: 'NOT_AI', message: 'Seat is not an AI' });
            return;
        }
        const result = (0, gameEngine_1.playCard)(room.gameState, seatIndex, cardId);
        if (result.error) {
            socket.emit('error', { code: 'INVALID_MOVE', message: result.error });
            return;
        }
        room.gameState = result.newState;
        io.to(roomCode).emit('card_played', {
            seatIndex,
            cardId,
            trickComplete: result.trickComplete,
            gameState: publicState(result.newState),
            ...(result.trickComplete && {
                trickResult: {
                    winnerSeat: result.newState.round.completedTricks.at(-1)?.winnerSeatIndex,
                    mindisInTrick: result.newState.round.completedTricks.at(-1)?.mindisInTrick ?? 0,
                    teamMindis: result.newState.round.teamMindis,
                    teamTricks: result.newState.round.teamTricks
                }
            })
        });
        if (result.roundComplete && result.roundResult) {
            room.phase = result.newState.phase;
            storeRoundResult(room, result.roundResult);
            if (result.newState.phase === 'game_over') {
                io.to(roomCode).emit('game_over', { winnerTeam: result.newState.winnerTeamId, finalScores: result.newState.gamePoints, roundResult: result.roundResult });
            }
            else {
                io.to(roomCode).emit('round_complete', { roundResult: result.roundResult, gamePoints: result.newState.gamePoints });
            }
        }
    });
    // ── AI Set Band Hukum (host acts on behalf of AI dealer) ────────
    socket.on('ai_set_band_hukum', ({ roomCode, seatIndex, cardId }) => {
        const room = (0, roomManager_1.getRoom)(roomCode);
        if (!room?.gameState) {
            socket.emit('error', { code: 'NO_GAME', message: 'No active game' });
            return;
        }
        if (room.hostSocketId !== socket.id) {
            socket.emit('error', { code: 'UNAUTHORIZED', message: 'Only host can act for AI' });
            return;
        }
        const seat = room.seats[seatIndex];
        if (!seat?.isAI) {
            socket.emit('error', { code: 'NOT_AI', message: 'Seat is not an AI' });
            return;
        }
        const { newState, error } = (0, gameEngine_1.applyBandHukum)(room.gameState, seatIndex, cardId);
        if (error) {
            socket.emit('error', { code: 'INVALID_MOVE', message: error });
            return;
        }
        room.gameState = newState;
        io.to(roomCode).emit('game_state_update', { gameState: publicState(newState) });
    });
    // ── Disconnect ──────────────────────────────────────────────────
    socket.on('disconnect', () => {
        const result = (0, roomManager_1.leaveRoom)(socket.id);
        if (!result)
            return;
        const { room, seatIndex } = result;
        if (room.phase === 'lobby') {
            io.to(room.code).emit('player_left', { seatIndex, players: (0, roomManager_1.getLobbyPlayers)(room) });
        }
        else {
            // Mid-game disconnect — notify room, pause handled client-side for now
            io.to(room.code).emit('player_disconnected', { seatIndex });
        }
    });
}
/** Send each player their private hand + AI hands to host on round/game start. */
function broadcastRoundState(io, room, state, eventName) {
    // Build AI hands map (only needed if room has AI seats)
    const aiHands = {};
    for (const seat of room.seats) {
        if (seat?.isAI)
            aiHands[seat.seatIndex] = state.players[seat.seatIndex].hand;
    }
    const hasAI = Object.keys(aiHands).length > 0;
    state.players.forEach(player => {
        if (player.id.startsWith('ai_seat_'))
            return; // no real socket for AI
        const playerSocket = io.sockets.sockets.get(player.id);
        if (playerSocket) {
            const isHost = player.id === room.hostSocketId;
            playerSocket.emit(eventName, {
                gameState: publicState(state),
                myHand: player.hand,
                mySeatIndex: player.seatIndex,
                ...(isHost && hasAI && { aiHands }),
            });
        }
    });
}
/** Store round result on room so next_round handler can use it. */
function storeRoundResult(room, result) {
    room._lastRoundResult = result;
}
