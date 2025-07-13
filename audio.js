// Audio management for Mafia game

class AudioManager {
    constructor() {
        this.sounds = new Map();
        this.enabled = true;
        this.volume = 0.7;
        this.loadSounds();
    }

    /**
     * Load all sound effects
     */
    loadSounds() {
        // Since we can't load actual audio files in this environment,
        // we'll create simple synthetic sounds using Web Audio API
        this.createSyntheticSounds();
    }

    /**
     * Create synthetic sounds using Web Audio API
     */
    createSyntheticSounds() {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        this.sounds.set('click', () => this.createTone(audioContext, 800, 0.1, 'square'));
        this.sounds.set('success', () => this.createChord(audioContext, [523, 659, 784], 0.3));
        this.sounds.set('error', () => this.createTone(audioContext, 200, 0.5, 'sawtooth'));
        this.sounds.set('notification', () => this.createTone(audioContext, 600, 0.2, 'sine'));
        this.sounds.set('join', () => this.createChord(audioContext, [440, 554], 0.2));
        this.sounds.set('leave', () => this.createTone(audioContext, 300, 0.3, 'triangle'));
        this.sounds.set('ready', () => this.createTone(audioContext, 700, 0.15, 'sine'));
        this.sounds.set('start', () => this.createFanfare(audioContext));
        this.sounds.set('reveal', () => this.createDramaticTone(audioContext));
    }

    /**
     * Create a simple tone
     */
    createTone(audioContext, frequency, duration, type = 'sine') {
        return () => {
            if (!this.enabled) return;

            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
            oscillator.type = type;

            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(this.volume * 0.3, audioContext.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + duration);
        };
    }

    /**
     * Create a chord
     */
    createChord(audioContext, frequencies, duration) {
        return () => {
            if (!this.enabled) return;

            frequencies.forEach((freq, index) => {
                setTimeout(() => {
                    const oscillator = audioContext.createOscillator();
                    const gainNode = audioContext.createGain();

                    oscillator.connect(gainNode);
                    gainNode.connect(audioContext.destination);

                    oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
                    oscillator.type = 'sine';

                    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
                    gainNode.gain.linearRampToValueAtTime(this.volume * 0.2, audioContext.currentTime + 0.01);
                    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);

                    oscillator.start(audioContext.currentTime);
                    oscillator.stop(audioContext.currentTime + duration);
                }, index * 50);
            });
        };
    }

    /**
     * Create a fanfare sound
     */
    createFanfare(audioContext) {
        return () => {
            if (!this.enabled) return;

            const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
            notes.forEach((freq, index) => {
                setTimeout(() => {
                    const oscillator = audioContext.createOscillator();
                    const gainNode = audioContext.createGain();

                    oscillator.connect(gainNode);
                    gainNode.connect(audioContext.destination);

                    oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
                    oscillator.type = 'triangle';

                    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
                    gainNode.gain.linearRampToValueAtTime(this.volume * 0.3, audioContext.currentTime + 0.01);
                    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);

                    oscillator.start(audioContext.currentTime);
                    oscillator.stop(audioContext.currentTime + 0.3);
                }, index * 100);
            });
        };
    }

    /**
     * Create a dramatic tone for role reveals
     */
    createDramaticTone(audioContext) {
        return () => {
            if (!this.enabled) return;

            // Low dramatic tone
            const oscillator1 = audioContext.createOscillator();
            const gainNode1 = audioContext.createGain();

            oscillator1.connect(gainNode1);
            gainNode1.connect(audioContext.destination);

            oscillator1.frequency.setValueAtTime(150, audioContext.currentTime);
            oscillator1.frequency.linearRampToValueAtTime(200, audioContext.currentTime + 0.5);
            oscillator1.type = 'sawtooth';

            gainNode1.gain.setValueAtTime(0, audioContext.currentTime);
            gainNode1.gain.linearRampToValueAtTime(this.volume * 0.4, audioContext.currentTime + 0.1);
            gainNode1.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 1.0);

            oscillator1.start(audioContext.currentTime);
            oscillator1.stop(audioContext.currentTime + 1.0);

            // High accent
            setTimeout(() => {
                const oscillator2 = audioContext.createOscillator();
                const gainNode2 = audioContext.createGain();

                oscillator2.connect(gainNode2);
                gainNode2.connect(audioContext.destination);

                oscillator2.frequency.setValueAtTime(800, audioContext.currentTime);
                oscillator2.type = 'sine';

                gainNode2.gain.setValueAtTime(0, audioContext.currentTime);
                gainNode2.gain.linearRampToValueAtTime(this.volume * 0.2, audioContext.currentTime + 0.01);
                gainNode2.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);

                oscillator2.start(audioContext.currentTime);
                oscillator2.stop(audioContext.currentTime + 0.3);
            }, 300);
        };
    }

    /**
     * Play a sound by name
     */
    play(soundName) {
        if (!this.enabled) return;

        const sound = this.sounds.get(soundName);
        if (sound) {
            try {
                sound();
            } catch (error) {
                console.warn(`Failed to play sound: ${soundName}`, error);
            }
        } else {
            console.warn(`Sound not found: ${soundName}`);
        }
    }

    /**
     * Set volume (0-1)
     */
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
    }

    /**
     * Enable/disable sounds
     */
    setEnabled(enabled) {
        this.enabled = enabled;
    }

    /**
     * Toggle sound on/off
     */
    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }
}

// Create global audio manager instance
const audioManager = new AudioManager();

// Convenience functions
function playSound(soundName) {
    audioManager.play(soundName);
}

function setSoundVolume(volume) {
    audioManager.setVolume(volume);
}

function toggleSound() {
    return audioManager.toggle();
}

// Add click sounds to buttons
document.addEventListener('DOMContentLoaded', () => {
    // Add click sound to all buttons
    document.addEventListener('click', (event) => {
        if (event.target.tagName === 'BUTTON' && !event.target.disabled) {
            playSound('click');
        }
    });

    // Add sound settings to localStorage
    const soundEnabled = Storage.get('soundEnabled', true);
    const soundVolume = Storage.get('soundVolume', 0.7);
    
    audioManager.setEnabled(soundEnabled);
    audioManager.setVolume(soundVolume);
});

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        AudioManager,
        audioManager,
        playSound,
        setSoundVolume,
        toggleSound
    };
}