// Simple WebSocket server for Mafia game
const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Create HTTP server to serve static files
const server = http.createServer((req, res) => {
    let filePath = '.' + req.url;
    if (filePath === './') {
        filePath = './index.html';
    }

    const extname = String(path.extname(filePath)).toLowerCase();
    const mimeTypes = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.wav': 'audio/wav',
        '.mp4': 'video/mp4',
        '.woff': 'application/font-woff',
        '.ttf': 'application/font-ttf',
        '.eot': 'application/vnd.ms-fontobject',
        '.otf': 'application/font-otf',
        '.wasm': 'application/wasm'
    };

    const contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('<h1>404 Not Found</h1>', 'utf-8');
            } else {
                res.writeHead(500);
                res.end(`Server Error: ${error.code}`, 'utf-8');
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Game state
const rooms = new Map();
const players = new Map(); // playerId -> { ws, roomCode, playerData }

// Utility functions
function generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function assignRoles(playerList, settings) {
    const roles = [];
    
    // Add roles based on settings
    for (let i = 0; i < settings.mafia; i++) roles.push('mafia');
    for (let i = 0; i < settings.detective; i++) roles.push('detective');
    for (let i = 0; i < settings.doctor; i++) roles.push('doctor');
    
    // Fill remaining with civilians
    const remaining = playerList.length - roles.length;
    for (let i = 0; i < remaining; i++) roles.push('civilian');
    
    const shuffledRoles = shuffleArray(roles);
    
    return playerList.map((player, index) => ({
        ...player,
        role: shuffledRoles[index]
    }));
}

function broadcastToRoom(roomCode, message, excludePlayerId = null) {
    const room = rooms.get(roomCode);
    if (!room) return;
    
    room.players.forEach(player => {
        if (player.id !== excludePlayerId && players.has(player.id)) {
            const playerConnection = players.get(player.id);
            if (playerConnection.ws.readyState === WebSocket.OPEN) {
                playerConnection.ws.send(JSON.stringify(message));
            }
        }
    });
}

function sendToPlayer(playerId, message) {
    if (players.has(playerId)) {
        const playerConnection = players.get(playerId);
        if (playerConnection.ws.readyState === WebSocket.OPEN) {
            playerConnection.ws.send(JSON.stringify(message));
        }
    }
}

// WebSocket connection handling
wss.on('connection', (ws) => {
    console.log('New client connected');
    
    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data);
            handleMessage(ws, message);
        } catch (error) {
            console.error('Error parsing message:', error);
            ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
        }
    });
    
    ws.on('close', () => {
        console.log('Client disconnected');
        handleDisconnection(ws);
    });
    
    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
});

function handleMessage(ws, message) {
    switch (message.type) {
        case 'createRoom':
            handleCreateRoom(ws, message);
            break;
        case 'joinRoom':
            handleJoinRoom(ws, message);
            break;
        case 'leaveRoom':
            handleLeaveRoom(ws, message);
            break;
        case 'toggleReady':
            handleToggleReady(ws, message);
            break;
        case 'startGame':
            handleStartGame(ws, message);
            break;
        case 'ping':
            ws.send(JSON.stringify({ type: 'pong' }));
            break;
        default:
            ws.send(JSON.stringify({ type: 'error', message: 'Unknown message type' }));
    }
}

function handleCreateRoom(ws, message) {
    const { username, settings } = message;
    const roomCode = generateRoomCode();
    const playerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const player = {
        id: playerId,
        username: username.trim(),
        ready: false,
        isHost: true,
        connected: true,
        joinedAt: new Date().toISOString()
    };
    
    const room = {
        code: roomCode,
        settings: settings,
        players: [player],
        gameStarted: false,
        createdAt: new Date().toISOString()
    };
    
    rooms.set(roomCode, room);
    players.set(playerId, { ws, roomCode, playerData: player });
    
    ws.send(JSON.stringify({
        type: 'roomCreated',
        roomCode: roomCode,
        playerId: playerId,
        room: room
    }));
}

function handleJoinRoom(ws, message) {
    const { username, roomCode } = message;
    const room = rooms.get(roomCode);
    
    if (!room) {
        ws.send(JSON.stringify({ type: 'error', message: 'Room not found' }));
        return;
    }
    
    if (room.gameStarted) {
        ws.send(JSON.stringify({ type: 'error', message: 'Game already started' }));
        return;
    }
    
    if (room.players.length >= room.settings.totalPlayers) {
        ws.send(JSON.stringify({ type: 'error', message: 'Room is full' }));
        return;
    }
    
    const playerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const player = {
        id: playerId,
        username: username.trim(),
        ready: false,
        isHost: false,
        connected: true,
        joinedAt: new Date().toISOString()
    };
    
    room.players.push(player);
    players.set(playerId, { ws, roomCode, playerData: player });
    
    ws.send(JSON.stringify({
        type: 'roomJoined',
        roomCode: roomCode,
        playerId: playerId,
        room: room
    }));
    
    broadcastToRoom(roomCode, {
        type: 'playerJoined',
        player: player,
        room: room
    }, playerId);
}

function handleLeaveRoom(ws, message) {
    const { playerId } = message;
    const playerConnection = players.get(playerId);
    
    if (!playerConnection) return;
    
    const room = rooms.get(playerConnection.roomCode);
    if (!room) return;
    
    // Remove player from room
    room.players = room.players.filter(p => p.id !== playerId);
    players.delete(playerId);
    
    // If room is empty, delete it
    if (room.players.length === 0) {
        rooms.delete(playerConnection.roomCode);
    } else {
        // If host left, assign new host
        if (playerConnection.playerData.isHost && room.players.length > 0) {
            room.players[0].isHost = true;
            const newHostConnection = players.get(room.players[0].id);
            if (newHostConnection) {
                newHostConnection.playerData.isHost = true;
            }
        }
        
        broadcastToRoom(playerConnection.roomCode, {
            type: 'playerLeft',
            playerId: playerId,
            room: room
        });
    }
    
    ws.send(JSON.stringify({ type: 'roomLeft' }));
}

function handleToggleReady(ws, message) {
    const { playerId } = message;
    const playerConnection = players.get(playerId);
    
    if (!playerConnection) return;
    
    const room = rooms.get(playerConnection.roomCode);
    if (!room) return;
    
    // Update player ready status
    const player = room.players.find(p => p.id === playerId);
    if (player) {
        player.ready = !player.ready;
        playerConnection.playerData.ready = player.ready;
        
        broadcastToRoom(playerConnection.roomCode, {
            type: 'playerReadyChanged',
            playerId: playerId,
            ready: player.ready,
            room: room
        });
    }
}

function handleStartGame(ws, message) {
    const { playerId } = message;
    const playerConnection = players.get(playerId);
    
    if (!playerConnection || !playerConnection.playerData.isHost) {
        ws.send(JSON.stringify({ type: 'error', message: 'Only host can start game' }));
        return;
    }
    
    const room = rooms.get(playerConnection.roomCode);
    if (!room) return;
    
    const readyPlayers = room.players.filter(p => p.ready);
    if (readyPlayers.length < 4) {
        ws.send(JSON.stringify({ type: 'error', message: 'Need at least 4 ready players' }));
        return;
    }
    
    // Assign roles
    const playersWithRoles = assignRoles(readyPlayers, room.settings);
    
    // Update room
    room.gameStarted = true;
    room.players = playersWithRoles;
    
    // Send role assignments to each player
    playersWithRoles.forEach(player => {
        const roleInfo = getRoleInfo(player.role);
        const teamMembers = player.role === 'mafia' 
            ? playersWithRoles.filter(p => p.role === 'mafia' && p.id !== player.id)
            : [];
        
        sendToPlayer(player.id, {
            type: 'gameStarted',
            role: player.role,
            roleInfo: roleInfo,
            teamMembers: teamMembers,
            room: room
        });
    });
}

function getRoleInfo(role) {
    const roleData = {
        mafia: {
            name: '🔪 Mafia',
            description: 'You are part of the Mafia! Work together with your fellow Mafia members to eliminate the innocent townspeople. You win when the Mafia equals or outnumbers the remaining players.',
            team: 'Mafia Team',
            color: 'mafia'
        },
        detective: {
            name: '🔍 Detective',
            description: 'You are the Detective! Each night, you can investigate one player to learn their true identity. Use this information to help the town identify and eliminate the Mafia.',
            team: 'Town Team',
            color: 'detective'
        },
        doctor: {
            name: '⚕️ Doctor',
            description: 'You are the Doctor! Each night, you can protect one player (including yourself) from being eliminated. Use your power wisely to keep important townspeople alive.',
            team: 'Town Team',
            color: 'doctor'
        },
        civilian: {
            name: '👤 Civilian',
            description: 'You are a Civilian! You have no special powers, but you have your voice and your vote. Pay attention during discussions and help identify the Mafia members.',
            team: 'Town Team',
            color: 'civilian'
        }
    };
    
    return roleData[role] || roleData.civilian;
}

function handleDisconnection(ws) {
    // Find and remove disconnected player
    for (const [playerId, playerConnection] of players.entries()) {
        if (playerConnection.ws === ws) {
            const room = rooms.get(playerConnection.roomCode);
            if (room) {
                // Mark player as disconnected instead of removing immediately
                const player = room.players.find(p => p.id === playerId);
                if (player) {
                    player.connected = false;
                    
                    broadcastToRoom(playerConnection.roomCode, {
                        type: 'playerDisconnected',
                        playerId: playerId,
                        room: room
                    });
                }
            }
            players.delete(playerId);
            break;
        }
    }
}

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} to play the game`);
});

// Cleanup disconnected players periodically
setInterval(() => {
    for (const [roomCode, room] of rooms.entries()) {
        const connectedPlayers = room.players.filter(p => p.connected);
        if (connectedPlayers.length === 0) {
            rooms.delete(roomCode);
        } else if (connectedPlayers.length !== room.players.length) {
            room.players = connectedPlayers;
            broadcastToRoom(roomCode, {
                type: 'playersUpdated',
                room: room
            });
        }
    }
}, 30000); // Check every 30 seconds