// Utility functions for the Mafia game

/**
 * Generate a random room code
 * @returns {string} 6-character uppercase room code
 */
function generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/**
 * Validate room code format
 * @param {string} code - Room code to validate
 * @returns {boolean} True if valid format
 */
function isValidRoomCode(code) {
    return /^[A-Z0-9]{6}$/.test(code);
}

/**
 * Validate username
 * @param {string} username - Username to validate
 * @returns {object} Validation result with isValid and message
 */
function validateUsername(username) {
    if (!username || username.trim().length === 0) {
        return { isValid: false, message: 'Username is required' };
    }
    
    if (username.trim().length < 2) {
        return { isValid: false, message: 'Username must be at least 2 characters' };
    }
    
    if (username.trim().length > 20) {
        return { isValid: false, message: 'Username must be less than 20 characters' };
    }
    
    if (!/^[a-zA-Z0-9\s_-]+$/.test(username.trim())) {
        return { isValid: false, message: 'Username can only contain letters, numbers, spaces, _ and -' };
    }
    
    return { isValid: true, message: '' };
}

/**
 * Calculate role distribution
 * @param {number} totalPlayers - Total number of players
 * @param {number} mafiaCount - Number of mafia
 * @param {number} detectiveCount - Number of detectives
 * @param {number} doctorCount - Number of doctors
 * @returns {object} Role distribution breakdown
 */
function calculateRoleDistribution(totalPlayers, mafiaCount, detectiveCount, doctorCount) {
    const specialRoles = mafiaCount + detectiveCount + doctorCount;
    const civilianCount = totalPlayers - specialRoles;
    
    return {
        mafia: mafiaCount,
        detective: detectiveCount,
        doctor: doctorCount,
        civilian: civilianCount,
        total: totalPlayers,
        isValid: civilianCount >= 0 && specialRoles <= totalPlayers
    };
}

/**
 * Shuffle array using Fisher-Yates algorithm
 * @param {Array} array - Array to shuffle
 * @returns {Array} Shuffled copy of array
 */
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

/**
 * Assign roles to players
 * @param {Array} players - Array of player objects
 * @param {object} roleDistribution - Role distribution object
 * @returns {Array} Players with assigned roles
 */
function assignRoles(players, roleDistribution) {
    if (players.length !== roleDistribution.total) {
        throw new Error('Player count does not match role distribution total');
    }
    
    const roles = [];
    
    // Add mafia roles
    for (let i = 0; i < roleDistribution.mafia; i++) {
        roles.push('mafia');
    }
    
    // Add detective roles
    for (let i = 0; i < roleDistribution.detective; i++) {
        roles.push('detective');
    }
    
    // Add doctor roles
    for (let i = 0; i < roleDistribution.doctor; i++) {
        roles.push('doctor');
    }
    
    // Add civilian roles
    for (let i = 0; i < roleDistribution.civilian; i++) {
        roles.push('civilian');
    }
    
    // Shuffle roles
    const shuffledRoles = shuffleArray(roles);
    
    // Assign roles to players
    return players.map((player, index) => ({
        ...player,
        role: shuffledRoles[index]
    }));
}

/**
 * Get role description
 * @param {string} role - Role name
 * @returns {object} Role information with name, description, and team
 */
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

/**
 * Format time duration
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted time string
 */
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Debounce function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Generate unique player ID
 * @returns {string} Unique player ID
 */
function generatePlayerId() {
    return `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Check if all players are ready
 * @param {Array} players - Array of player objects
 * @returns {boolean} True if all players are ready
 */
function allPlayersReady(players) {
    return players.length > 0 && players.every(player => player.ready);
}

/**
 * Get minimum players required for game
 * @param {object} settings - Game settings
 * @returns {number} Minimum player count
 */
function getMinimumPlayers(settings) {
    return Math.max(4, settings.mafia + settings.detective + settings.doctor + 2);
}

/**
 * Create player object
 * @param {string} username - Player username
 * @param {string} id - Player ID
 * @param {boolean} isHost - Whether player is host
 * @returns {object} Player object
 */
function createPlayer(username, id = null, isHost = false) {
    return {
        id: id || generatePlayerId(),
        username: username.trim(),
        ready: false,
        isHost: isHost,
        role: null,
        connected: true,
        joinedAt: new Date().toISOString()
    };
}

/**
 * Storage helper functions
 */
const Storage = {
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('Failed to save to localStorage:', error);
            return false;
        }
    },
    
    get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error('Failed to read from localStorage:', error);
            return defaultValue;
        }
    },
    
    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Failed to remove from localStorage:', error);
            return false;
        }
    },
    
    clear() {
        try {
            localStorage.clear();
            return true;
        } catch (error) {
            console.error('Failed to clear localStorage:', error);
            return false;
        }
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        generateRoomCode,
        isValidRoomCode,
        validateUsername,
        calculateRoleDistribution,
        shuffleArray,
        assignRoles,
        getRoleInfo,
        formatTime,
        debounce,
        generatePlayerId,
        allPlayersReady,
        getMinimumPlayers,
        createPlayer,
        Storage
    };
}