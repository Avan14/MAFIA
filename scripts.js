// Main application logic for Mafia game room manager

class MafiaGameApp {
    constructor() {
        this.currentScreen = 'home';
        this.currentUser = null;
        this.currentRoom = null;
        this.players = [];
        this.isHost = false;
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
        this.showScreen('home');
        this.startHeartbeat();
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
    }

    /**
     * Load saved data from localStorage
     */
    loadSavedData() {
        const savedUsername = Storage.get('username');
        if (savedUsername) {
            document.getElementById('username').value = savedUsername;
        }

        const savedRoom = Storage.get('currentRoom');
        const savedUser = Storage.get('currentUser');
        
        if (savedRoom && savedUser) {
            this.currentRoom = savedRoom;
            this.currentUser = savedUser;
            this.players = Storage.get('players', []);
            this.isHost = savedUser.isHost;
            
            // Check if we're in a game
            if (savedRoom.gameStarted) {
                this.showGameScreen();
            } else {
                this.showWaitingRoom();
            }
        }
    }

    /**
     * Start heartbeat for simulating real-time updates
     */
    startHeartbeat() {
        setInterval(() => {
            if (this.currentRoom && this.currentScreen === 'waiting-room') {
                this.simulatePlayerUpdates();
            }
        }, 3000);
    }

    /**
     * Simulate player updates for demo purposes
     */
    simulatePlayerUpdates() {
        // Randomly toggle ready state of AI players
        this.players.forEach(player => {
            if (player.id !== this.currentUser?.id && Math.random() < 0.1) {
                player.ready = !player.ready;
            }
        });

        this.updatePlayersDisplay();
        this.updateStartButton();
        Storage.set('players', this.players);
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
        
        this.currentUser = createPlayer(username, generatePlayerId(), false);
        Storage.set('username', username);
        Storage.set('currentUser', this.currentUser);
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
        this.showLoading('Creating room...');
        
        setTimeout(() => {
            const roomCode = document.getElementById('generated-room-code').textContent;
            
            this.currentRoom = {
                code: roomCode,
                settings: { ...this.gameSettings },
                createdAt: new Date().toISOString(),
                gameStarted: false
            };
            
            this.currentUser.isHost = true;
            this.isHost = true;
            this.players = [{ ...this.currentUser }];
            
            // Add some AI players for demo
            this.addDemoPlayers();
            
            Storage.set('currentRoom', this.currentRoom);
            Storage.set('currentUser', this.currentUser);
            Storage.set('players', this.players);
            
            this.hideLoading();
            this.showWaitingRoom();
            playSound('success');
            this.showToast('Room created successfully!');
        }, 1000);
    }

    /**
     * Add demo AI players
     */
    addDemoPlayers() {
        const aiNames = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace'];
        const maxAI = Math.min(3, this.gameSettings.totalPlayers - 1);
        
        for (let i = 0; i < maxAI; i++) {
            const aiPlayer = createPlayer(aiNames[i], generatePlayerId(), false);
            aiPlayer.ready = Math.random() < 0.3;
            this.players.push(aiPlayer);
        }
    }

    /**
     * Join existing room
     */
    joinRoom() {
        const roomCode = document.getElementById('room-code-input').value.trim();
        
        if (!isValidRoomCode(roomCode)) {
            this.showRoomCodeError('Please enter a valid 6-character room code');
            return;
        }
        
        this.showLoading('Joining room...');
        
        setTimeout(() => {
            // Simulate room lookup
            const roomExists = Math.random() < 0.8; // 80% chance room exists for demo
            
            if (!roomExists) {
                this.hideLoading();
                this.showRoomCodeError('Room not found. Please check the code and try again.');
                playSound('error');
                return;
            }
            
            // Create mock room data
            this.currentRoom = {
                code: roomCode,
                settings: { ...this.gameSettings },
                createdAt: new Date().toISOString(),
                gameStarted: false
            };
            
            this.currentUser.isHost = false;
            this.isHost = false;
            
            // Create mock player list
            this.players = [
                createPlayer('Host', generatePlayerId(), true),
                { ...this.currentUser }
            ];
            
            this.addDemoPlayers();
            
            Storage.set('currentRoom', this.currentRoom);
            Storage.set('currentUser', this.currentUser);
            Storage.set('players', this.players);
            
            this.hideLoading();
            this.showWaitingRoom();
            playSound('join');
            this.showToast('Joined room successfully!');
        }, 1500);
    }

    /**
     * Leave current room
     */
    leaveRoom() {
        this.showLoading('Leaving room...');
        
        setTimeout(() => {
            this.currentRoom = null;
            this.players = [];
            this.isHost = false;
            
            Storage.remove('currentRoom');
            Storage.remove('players');
            
            this.hideLoading();
            this.showScreen('home');
            playSound('leave');
            this.showToast('Left room');
        }, 500);
    }

    /**
     * Toggle ready status
     */
    toggleReady() {
        if (!this.currentUser) return;
        
        this.currentUser.ready = !this.currentUser.ready;
        
        // Update player in players array
        const playerIndex = this.players.findIndex(p => p.id === this.currentUser.id);
        if (playerIndex !== -1) {
            this.players[playerIndex].ready = this.currentUser.ready;
        }
        
        Storage.set('currentUser', this.currentUser);
        Storage.set('players', this.players);
        
        this.updateReadyButton();
        this.updatePlayersDisplay();
        this.updateStartButton();
        
        playSound('ready');
        this.showToast(this.currentUser.ready ? 'You are ready!' : 'You are not ready');
    }

    /**
     * Start the game
     */
    startGame() {
        if (!this.isHost) return;
        
        const readyPlayers = this.players.filter(p => p.ready);
        if (readyPlayers.length < 4) {
            this.showToast('Need at least 4 ready players to start', 'error');
            return;
        }
        
        this.showLoading('Starting game...');
        
        setTimeout(() => {
            // Assign roles to ready players
            const gameRoles = calculateRoleDistribution(
                readyPlayers.length,
                Math.min(this.currentRoom.settings.mafia, Math.floor(readyPlayers.length / 3)),
                Math.min(this.currentRoom.settings.detective, 1),
                Math.min(this.currentRoom.settings.doctor, 1)
            );
            
            const playersWithRoles = assignRoles(readyPlayers, gameRoles);
            
            // Update players array
            playersWithRoles.forEach(rolePlayer => {
                const index = this.players.findIndex(p => p.id === rolePlayer.id);
                if (index !== -1) {
                    this.players[index] = rolePlayer;
                }
            });
            
            // Update current user
            const currentUserWithRole = playersWithRoles.find(p => p.id === this.currentUser.id);
            if (currentUserWithRole) {
                this.currentUser = currentUserWithRole;
            }
            
            this.currentRoom.gameStarted = true;
            
            Storage.set('currentRoom', this.currentRoom);
            Storage.set('currentUser', this.currentUser);
            Storage.set('players', this.players);
            
            this.hideLoading();
            this.showGameScreen();
            playSound('start');
        }, 2000);
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
            <div class="player-item">
                <span class="player-name">${player.username}</span>
                <div class="player-status">
                    ${player.isHost ? '<span class="status-indicator host"></span> Host' : ''}
                    ${player.ready ? '<span class="status-indicator ready"></span> Ready' : '<span class="status-indicator"></span> Not Ready'}
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
        const readyPlayers = this.players.filter(p => p.ready);
        const canStart = readyPlayers.length >= 4 && allPlayersReady(this.players);
        
        startBtn.disabled = !canStart;
        
        const helpText = document.querySelector('.help-text');
        if (readyPlayers.length < 4) {
            helpText.textContent = `Need at least 4 ready players (${readyPlayers.length}/4)`;
        } else if (!allPlayersReady(this.players)) {
            helpText.textContent = 'All players must be ready to start';
        } else {
            helpText.textContent = 'Ready to start!';
        }
    }

    /**
     * Show game screen with role reveal
     */
    showGameScreen() {
        if (!this.currentUser?.role) return;
        
        const roleInfo = getRoleInfo(this.currentUser.role);
        
        document.getElementById('player-role').textContent = roleInfo.name;
        document.getElementById('player-role').className = `role-display ${roleInfo.color}`;
        document.getElementById('role-description').textContent = roleInfo.description;
        
        // Show team information for mafia
        const teamInfo = document.getElementById('team-info');
        if (this.currentUser.role === 'mafia') {
            const mafiaMembers = this.players
                .filter(p => p.role === 'mafia' && p.id !== this.currentUser.id)
                .map(p => p.username);
            
            if (mafiaMembers.length > 0) {
                teamInfo.innerHTML = `
                    <strong>Your Mafia Partners:</strong><br>
                    ${mafiaMembers.join(', ')}
                `;
            } else {
                teamInfo.innerHTML = '<strong>You are the only Mafia member.</strong>';
            }
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