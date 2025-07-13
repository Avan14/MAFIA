// Main application logic for Mafia game room manager with WebSocket support

class MafiaGameApp {
    constructor() {
        this.currentScreen = 'home';
        this.currentUser = null;
        this.currentRoom = null;
        this.players = [];
        this.isHost = false;
        this.ws = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.gameSettings = {
            totalPlayers: 7,
            mafia: 2,
            detective: 1,
            doctor: 1
        };
        
        this.init();
    }

    /**
     * Initialize the application
     */
    init() {
        this.bindEvents();
        this.loadSavedData();
        this.connectWebSocket();
        this.showScreen('home');
    }

    /**
     * Connect to WebSocket server
     */
    connectWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        // Use port 3001 for WebSocket connection regardless of current page port
        const wsUrl = `${protocol}//${window.location.hostname}:3001`;
        
        try {
            this.ws = new WebSocket(wsUrl);
            
            this.ws.onopen = () => {
                console.log('Connected to server');
                this.reconnectAttempts = 0;
                this.hideConnectionError();
            };
            
            this.ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    this.handleServerMessage(message);
                } catch (error) {
                    console.error('Error parsing server message:', error);
                    console.error('Raw message:', event.data);
                }
            };
            
            this.ws.onclose = () => {
                console.log('Disconnected from server');
                this.showConnectionError();
                this.attemptReconnect();
            };
            
            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.showConnectionError();
            };
        } catch (error) {
            console.error('Failed to connect to WebSocket:', error);
            this.showConnectionError();
        }
    }

    /**
     * Attempt to reconnect to WebSocket
     */
    attemptReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            
            setTimeout(() => {
                this.connectWebSocket();
            }, 2000 * this.reconnectAttempts);
        } else {
            this.showToast('Connection lost. Please refresh the page.', 'error');
        }
    }

    /**
     * Send message to server
     */
    sendMessage(message) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        } else {
            this.showToast('Not connected to server', 'error');
        }
    }

    /**
     * Handle messages from server
     */
    handleServerMessage(message) {
        switch (message.type) {
            case 'roomCreated':
                this.handleRoomCreated(message);
                break;
            case 'roomJoined':
                this.handleRoomJoined(message);
                break;
            case 'playerJoined':
                this.handlePlayerJoined(message);
                break;
            case 'playerLeft':
                this.handlePlayerLeft(message);
                break;
            case 'playerReadyChanged':
                this.handlePlayerReadyChanged(message);
                break;
            case 'playerDisconnected':
                this.handlePlayerDisconnected(message);
                break;
            case 'gameStarted':
                this.handleGameStarted(message);
                break;
            case 'roomLeft':
                this.handleRoomLeft();
                break;
            case 'error':
                // Clear timeouts on error
                if (this.roomCreationTimeout) {
                    clearTimeout(this.roomCreationTimeout);
                    this.roomCreationTimeout = null;
                }
                if (this.joinRoomTimeout) {
                    clearTimeout(this.joinRoomTimeout);
                    this.joinRoomTimeout = null;
                }
                this.showToast(message.message, 'error');
                this.hideLoading();
                break;
            case 'pong':
                // Handle ping response
                break;
            default:
                console.warn('Unknown message type:', message.type);
        }
    }

    /**
     * Handle room created response
     */
    handleRoomCreated(message) {
        // Clear the timeout
        if (this.roomCreationTimeout) {
            clearTimeout(this.roomCreationTimeout);
            this.roomCreationTimeout = null;
        }
        
        this.currentRoom = message.room;
        this.currentUser = message.room.players.find(p => p.id === message.playerId);
        this.players = message.room.players;
        this.isHost = true;
        
        Storage.set('currentRoom', this.currentRoom);
        Storage.set('currentUser', this.currentUser);
        Storage.set('playerId', message.playerId);
        
        this.hideLoading();
        this.showWaitingRoom();
        playSound('success');
        this.showToast('Room created successfully!');
    }

    /**
     * Handle room joined response
     */
    handleRoomJoined(message) {
        // Clear the timeout
        if (this.joinRoomTimeout) {
            clearTimeout(this.joinRoomTimeout);
            this.joinRoomTimeout = null;
        }
        
        this.currentRoom = message.room;
        this.currentUser = message.room.players.find(p => p.id === message.playerId);
        this.players = message.room.players;
        this.isHost = false;
        
        Storage.set('currentRoom', this.currentRoom);
        Storage.set('currentUser', this.currentUser);
        Storage.set('playerId', message.playerId);
        
        this.hideLoading();
        this.showWaitingRoom();
        playSound('join');
        this.showToast('Joined room successfully!');
    }

    /**
     * Handle player joined
     */
    handlePlayerJoined(message) {
        this.currentRoom = message.room;
        this.players = message.room.players;
        this.updatePlayersDisplay();
        this.updateStartButton();
        playSound('notification');
        this.showToast(`${message.player.username} joined the room`);
    }

    /**
     * Handle player left
     */
    handlePlayerLeft(message) {
        this.currentRoom = message.room;
        this.players = message.room.players;
        
        // Check if we became host
        if (this.currentUser) {
            const updatedUser = this.players.find(p => p.id === this.currentUser.id);
            if (updatedUser && updatedUser.isHost !== this.isHost) {
                this.isHost = updatedUser.isHost;
                this.currentUser.isHost = this.isHost;
                if (this.isHost) {
                    this.showToast('You are now the host!');
                }
            }
        }
        
        this.updatePlayersDisplay();
        this.updateHostControls();
        this.updateStartButton();
        playSound('leave');
    }

    /**
     * Handle player ready status changed
     */
    handlePlayerReadyChanged(message) {
        this.currentRoom = message.room;
        this.players = message.room.players;
        
        // Update current user if it's us
        if (message.playerId === this.currentUser?.id) {
            this.currentUser.ready = message.ready;
            this.updateReadyButton();
        }
        
        this.updatePlayersDisplay();
        this.updateStartButton();
        playSound('ready');
    }

    /**
     * Handle player disconnected
     */
    handlePlayerDisconnected(message) {
        this.currentRoom = message.room;
        this.players = message.room.players;
        this.updatePlayersDisplay();
        this.showToast('A player disconnected', 'warning');
    }

    /**
     * Handle game started
     */
    handleGameStarted(message) {
        this.currentUser.role = message.role;
        this.currentRoom = message.room;
        this.players = message.room.players;
        
        Storage.set('currentUser', this.currentUser);
        Storage.set('currentRoom', this.currentRoom);
        
        this.showGameScreen(message.roleInfo, message.teamMembers);
        playSound('start');
    }

    /**
     * Handle room left
     */
    handleRoomLeft() {
        this.currentRoom = null;
        this.players = [];
        this.isHost = false;
        this.currentUser = null;
        
        Storage.remove('currentRoom');
        Storage.remove('currentUser');
        Storage.remove('playerId');
        
        this.hideLoading();
        this.showScreen('home');
        playSound('leave');
        this.showToast('Left room');
    }

    /**
     * Show/hide connection error
     */
    showConnectionError() {
        let errorDiv = document.getElementById('connection-error');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.id = 'connection-error';
            errorDiv.className = 'connection-error';
            errorDiv.innerHTML = '⚠️ Connection lost. Attempting to reconnect...';
            document.body.appendChild(errorDiv);
        }
        errorDiv.style.display = 'block';
    }

    hideConnectionError() {
        const errorDiv = document.getElementById('connection-error');
        if (errorDiv) {
            errorDiv.style.display = 'none';
        }
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Home screen events
        document.getElementById('create-room-btn').addEventListener('click', () => {
            if (this.validateUsername()) {
                this.showCreateRoomScreen();
            }
        });

        document.getElementById('join-room-btn').addEventListener('click', () => {
            if (this.validateUsername()) {
                this.showJoinRoomScreen();
            }
        });

        // Create room events
        document.getElementById('back-from-create').addEventListener('click', () => {
            this.showScreen('home');
        });

        document.getElementById('room-settings-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.createRoom();
        });

        document.getElementById('copy-code-btn').addEventListener('click', () => {
            this.copyRoomCode();
        });

        // Settings change events
        ['total-players', 'mafia-count', 'detective-count', 'doctor-count'].forEach(id => {
            document.getElementById(id).addEventListener('change', () => {
                this.updateRoleBreakdown();
            });
        });

        // Join room events
        document.getElementById('back-from-join').addEventListener('click', () => {
            this.showScreen('home');
        });

        document.getElementById('join-room-submit').addEventListener('click', () => {
            this.joinRoom();
        });

        document.getElementById('room-code-input').addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase();
        });

        // Waiting room events
        document.getElementById('leave-room-btn').addEventListener('click', () => {
            this.leaveRoom();
        });

        document.getElementById('ready-toggle-btn').addEventListener('click', () => {
            this.toggleReady();
        });

        document.getElementById('start-game-btn').addEventListener('click', () => {
            this.startGame();
        });

        // Username input events
        document.getElementById('username').addEventListener('input', () => {
            this.clearUsernameError();
        });

        document.getElementById('room-code-input').addEventListener('input', () => {
            this.clearRoomCodeError();
        });

        // Heartbeat to keep connection alive
        setInterval(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.sendMessage({ type: 'ping' });
            }
        }, 30000);
    }

    /**
     * Load saved data from localStorage
     */
    loadSavedData() {
        const savedUsername = Storage.get('username');
        if (savedUsername) {
            document.getElementById('username').value = savedUsername;
        }

        // Check if we were in a room (for reconnection)
        const savedRoom = Storage.get('currentRoom');
        const savedUser = Storage.get('currentUser');
        const playerId = Storage.get('playerId');
        
        if (savedRoom && savedUser && playerId) {
            // We'll handle reconnection when WebSocket connects
            this.showLoading('Reconnecting...');
        }
    }

    /**
     * Validate username input
     */
    validateUsername() {
        const username = document.getElementById('username').value;
        const validation = validateUsername(username);
        
        if (!validation.isValid) {
            this.showUsernameError(validation.message);
            return false;
        }
        
        Storage.set('username', username);
        return true;
    }

    /**
     * Show username error
     */
    showUsernameError(message) {
        const errorElement = document.getElementById('username-error');
        errorElement.textContent = message;
        errorElement.classList.add('show');
        playSound('error');
    }

    /**
     * Clear username error
     */
    clearUsernameError() {
        const errorElement = document.getElementById('username-error');
        errorElement.classList.remove('show');
    }

    /**
     * Show room code error
     */
    showRoomCodeError(message) {
        const errorElement = document.getElementById('room-code-error');
        errorElement.textContent = message;
        errorElement.classList.add('show');
        playSound('error');
    }

    /**
     * Clear room code error
     */
    clearRoomCodeError() {
        const errorElement = document.getElementById('room-code-error');
        errorElement.classList.remove('show');
    }

    /**
     * Show create room screen
     */
    showCreateRoomScreen() {
        const roomCode = generateRoomCode();
        document.getElementById('generated-room-code').textContent = roomCode;
        this.updateRoleBreakdown();
        this.showScreen('create-room');
        playSound('success');
    }

    /**
     * Show join room screen
     */
    showJoinRoomScreen() {
        document.getElementById('room-code-input').value = '';
        this.clearRoomCodeError();
        this.showScreen('join-room');
        playSound('success');
    }

    /**
     * Update role breakdown display
     */
    updateRoleBreakdown() {
        const totalPlayers = parseInt(document.getElementById('total-players').value);
        const mafia = parseInt(document.getElementById('mafia-count').value);
        const detective = parseInt(document.getElementById('detective-count').value);
        const doctor = parseInt(document.getElementById('doctor-count').value);

        const distribution = calculateRoleDistribution(totalPlayers, mafia, detective, doctor);
        const breakdown = document.getElementById('role-breakdown');
        
        if (!distribution.isValid) {
            breakdown.innerHTML = '<span style="color: #ef4444;">Invalid role distribution</span>';
            return;
        }

        const roles = [];
        
        if (distribution.mafia > 0) {
            roles.push(`<span class="role-tag mafia">${distribution.mafia} Mafia</span>`);
        }
        if (distribution.detective > 0) {
            roles.push(`<span class="role-tag detective">${distribution.detective} Detective</span>`);
        }
        if (distribution.doctor > 0) {
            roles.push(`<span class="role-tag doctor">${distribution.doctor} Doctor</span>`);
        }
        if (distribution.civilian > 0) {
            roles.push(`<span class="role-tag">${distribution.civilian} Civilian${distribution.civilian > 1 ? 's' : ''}</span>`);
        }

        breakdown.innerHTML = roles.join('');
        
        // Update game settings
        this.gameSettings = {
            totalPlayers: totalPlayers,
            mafia: mafia,
            detective: detective,
            doctor: doctor
        };
    }

    /**
     * Create a new room
     */
    createRoom() {
        const username = document.getElementById('username').value.trim();
        
        this.showLoading('Creating room...');
        
        // Set a timeout to prevent infinite loading
        this.roomCreationTimeout = setTimeout(() => {
            this.hideLoading();
            this.showToast('Room creation timed out. Please try again.', 'error');
        }, 10000); // 10 seconds timeout
        
        this.sendMessage({
            type: 'createRoom',
            username: username,
            settings: { ...this.gameSettings }
        });
    }

    /**
     * Join existing room
     */
    joinRoom() {
        const roomCode = document.getElementById('room-code-input').value.trim();
        const username = document.getElementById('username').value.trim();
        
        if (!isValidRoomCode(roomCode)) {
            this.showRoomCodeError('Please enter a valid 6-character room code');
            return;
        }
        
        this.showLoading('Joining room...');
        
        // Set a timeout to prevent infinite loading
        this.joinRoomTimeout = setTimeout(() => {
            this.hideLoading();
            this.showToast('Joining room timed out. Please try again.', 'error');
        }, 10000); // 10 seconds timeout
        
        this.sendMessage({
            type: 'joinRoom',
            username: username,
            roomCode: roomCode
        });
    }

    /**
     * Leave current room
     */
    leaveRoom() {
        if (!this.currentUser) return;
        
        this.showLoading('Leaving room...');
        
        this.sendMessage({
            type: 'leaveRoom',
            playerId: this.currentUser.id
        });
    }

    /**
     * Toggle ready status
     */
    toggleReady() {
        if (!this.currentUser) return;
        
        this.sendMessage({
            type: 'toggleReady',
            playerId: this.currentUser.id
        });
    }

    /**
     * Start the game
     */
    startGame() {
        if (!this.isHost || !this.currentUser) return;
        
        const readyPlayers = this.players.filter(p => p.ready);
        if (readyPlayers.length < 4) {
            this.showToast('Need at least 4 ready players to start', 'error');
            return;
        }
        
        this.showLoading('Starting game...');
        
        this.sendMessage({
            type: 'startGame',
            playerId: this.currentUser.id
        });
    }

    /**
     * Show waiting room
     */
    showWaitingRoom() {
        document.getElementById('current-room-code').textContent = this.currentRoom.code;
        this.updatePlayersDisplay();
        this.updateGameSettingsDisplay();
        this.updateReadyButton();
        this.updateHostControls();
        this.updateStartButton();
        this.showScreen('waiting-room');
    }

    /**
     * Update players display
     */
    updatePlayersDisplay() {
        const playersList = document.getElementById('players-list');
        const playerCount = document.getElementById('player-count');
        const maxPlayers = document.getElementById('max-players');
        
        playerCount.textContent = this.players.length;
        maxPlayers.textContent = this.currentRoom.settings.totalPlayers;
        
        playersList.innerHTML = this.players.map(player => `
            <div class="player-item ${!player.connected ? 'disconnected' : ''}">
                <span class="player-name">${player.username}</span>
                <div class="player-status">
                    ${player.isHost ? '<span class="status-indicator host"></span> Host' : ''}
                    ${!player.connected ? '<span class="status-indicator disconnected"></span> Disconnected' : 
                      player.ready ? '<span class="status-indicator ready"></span> Ready' : '<span class="status-indicator"></span> Not Ready'}
                </div>
            </div>
        `).join('');
    }

    /**
     * Update game settings display
     */
    updateGameSettingsDisplay() {
        const settingsDisplay = document.getElementById('game-settings-display');
        const settings = this.currentRoom.settings;
        
        settingsDisplay.innerHTML = `
            <div class="setting-item">
                <span class="setting-label">Total Players</span>
                <span class="setting-value">${settings.totalPlayers}</span>
            </div>
            <div class="setting-item">
                <span class="setting-label">Mafia</span>
                <span class="setting-value">${settings.mafia}</span>
            </div>
            <div class="setting-item">
                <span class="setting-label">Detective</span>
                <span class="setting-value">${settings.detective}</span>
            </div>
            <div class="setting-item">
                <span class="setting-label">Doctor</span>
                <span class="setting-value">${settings.doctor}</span>
            </div>
            <div class="setting-item">
                <span class="setting-label">Civilians</span>
                <span class="setting-value">${settings.totalPlayers - settings.mafia - settings.detective - settings.doctor}</span>
            </div>
        `;
    }

    /**
     * Update ready button
     */
    updateReadyButton() {
        const readyBtn = document.getElementById('ready-toggle-btn');
        if (this.currentUser?.ready) {
            readyBtn.textContent = 'Not Ready';
            readyBtn.classList.remove('btn-secondary');
            readyBtn.classList.add('btn-primary');
        } else {
            readyBtn.textContent = 'Ready Up';
            readyBtn.classList.remove('btn-primary');
            readyBtn.classList.add('btn-secondary');
        }
    }

    /**
     * Update host controls
     */
    updateHostControls() {
        const hostControls = document.getElementById('host-controls');
        hostControls.style.display = this.isHost ? 'block' : 'none';
    }

    /**
     * Update start button
     */
    updateStartButton() {
        if (!this.isHost) return;
        
        const startBtn = document.getElementById('start-game-btn');
        const readyPlayers = this.players.filter(p => p.ready && p.connected);
        const canStart = readyPlayers.length >= 4;
        
        startBtn.disabled = !canStart;
        
        const helpText = document.querySelector('.help-text');
        if (readyPlayers.length < 4) {
            helpText.textContent = `Need at least 4 ready players (${readyPlayers.length}/4)`;
        } else {
            helpText.textContent = 'Ready to start!';
        }
    }

    /**
     * Show game screen with role reveal
     */
    showGameScreen(roleInfo, teamMembers = []) {
        document.getElementById('player-role').textContent = roleInfo.name;
        document.getElementById('player-role').className = `role-display ${roleInfo.color}`;
        document.getElementById('role-description').textContent = roleInfo.description;
        
        // Show team information for mafia
        const teamInfo = document.getElementById('team-info');
        if (this.currentUser.role === 'mafia' && teamMembers.length > 0) {
            teamInfo.innerHTML = `
                <strong>Your Mafia Partners:</strong><br>
                ${teamMembers.map(p => p.username).join(', ')}
            `;
        } else if (this.currentUser.role === 'mafia') {
            teamInfo.innerHTML = '<strong>You are the only Mafia member.</strong>';
        } else {
            teamInfo.innerHTML = '';
        }
        
        this.showScreen('game');
        
        setTimeout(() => {
            playSound('reveal');
        }, 500);
    }

    /**
     * Copy room code to clipboard
     */
    async copyRoomCode() {
        const roomCode = document.getElementById('generated-room-code').textContent;
        
        try {
            await navigator.clipboard.writeText(roomCode);
            this.showToast('Room code copied to clipboard!');
            playSound('success');
        } catch (error) {
            // Fallback for browsers that don't support clipboard API
            const textArea = document.createElement('textarea');
            textArea.value = roomCode;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            
            this.showToast('Room code copied to clipboard!');
            playSound('success');
        }
    }

    /**
     * Show screen
     */
    showScreen(screenName) {
        // Hide all screens
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        
        // Show target screen
        document.getElementById(`${screenName}-screen`).classList.add('active');
        this.currentScreen = screenName;
    }

    /**
     * Show loading overlay
     */
    showLoading(message = 'Loading...') {
        document.getElementById('loading-text').textContent = message;
        document.getElementById('loading-overlay').style.display = 'flex';
    }

    /**
     * Hide loading overlay
     */
    hideLoading() {
        document.getElementById('loading-overlay').style.display = 'none';
    }

    /**
     * Show toast notification
     */
    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        document.getElementById('toast-container').appendChild(toast);
        
        playSound(type === 'error' ? 'error' : 'notification');
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.mafiaApp = new MafiaGameApp();
});