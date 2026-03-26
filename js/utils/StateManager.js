// StateManager - Central state management with persistence

import { eventBus, EVENTS } from './EventBus.js';
import { AUDIO_DEFAULTS, TUTORIAL_DEFAULTS, STORAGE_KEYS } from '../config.js';

// Initial state shape
const initialState = {
    audio: {
        volume: AUDIO_DEFAULTS.volume,
        reverb: AUDIO_DEFAULTS.reverb,
        transpose: AUDIO_DEFAULTS.transpose,
        octave: AUDIO_DEFAULTS.octave,
        reedStack: AUDIO_DEFAULTS.reedStack,
        isReady: false,
    },
    keyboard: {
        activeNotes: new Set(),
        highlightedNote: null,
    },
    tutorial: {
        active: false,
        currentSong: null,
        currentStep: 0,
        totalSteps: 0,
        tempo: TUTORIAL_DEFAULTS.tempo,
        mode: TUTORIAL_DEFAULTS.mode,
        score: 0,
        mistakes: 0,
    },
    notation: {
        captured: [],
        recording: false,
    },
    ui: {
        currentPanel: 'controls',
        isLoading: true,
    },
};

class StateManager {
    constructor() {
        // Deep clone initial state
        this.state = JSON.parse(JSON.stringify(initialState));
        // Restore Set for activeNotes (JSON doesn't preserve Sets)
        this.state.keyboard.activeNotes = new Set();
        this.subscribers = new Map();
    }

    /**
     * Get state value at path
     * @param {string} path - Dot-notation path (e.g., 'audio.volume')
     * @returns {any} Value at path
     */
    get(path) {
        if (!path) return this.state;

        const keys = path.split('.');
        let value = this.state;

        for (const key of keys) {
            if (value === undefined || value === null) return undefined;
            value = value[key];
        }

        return value;
    }

    /**
     * Set state value at path
     * @param {string} path - Dot-notation path
     * @param {any} value - New value
     */
    set(path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        let target = this.state;

        for (const key of keys) {
            if (!(key in target)) {
                target[key] = {};
            }
            target = target[key];
        }

        const oldValue = target[lastKey];
        target[lastKey] = value;

        // Notify subscribers
        this.notifySubscribers(path, value, oldValue);

        // Emit global state change event
        eventBus.emit(EVENTS.STATE_CHANGE, { path, value, oldValue });
    }

    /**
     * Subscribe to state changes at path
     * @param {string} path - Dot-notation path
     * @param {Function} callback - Called with (newValue, oldValue)
     * @returns {Function} Unsubscribe function
     */
    subscribe(path, callback) {
        if (!this.subscribers.has(path)) {
            this.subscribers.set(path, new Set());
        }
        this.subscribers.get(path).add(callback);

        return () => {
            const subs = this.subscribers.get(path);
            if (subs) subs.delete(callback);
        };
    }

    /**
     * Notify subscribers of state change
     */
    notifySubscribers(path, newValue, oldValue) {
        // Exact path match
        if (this.subscribers.has(path)) {
            this.subscribers.get(path).forEach(cb => cb(newValue, oldValue));
        }

        // Parent path subscribers (e.g., 'audio' when 'audio.volume' changes)
        const pathParts = path.split('.');
        for (let i = pathParts.length - 1; i > 0; i--) {
            const parentPath = pathParts.slice(0, i).join('.');
            if (this.subscribers.has(parentPath)) {
                const parentValue = this.get(parentPath);
                this.subscribers.get(parentPath).forEach(cb => cb(parentValue, parentValue));
            }
        }
    }

    /**
     * Add a note to active notes
     * @param {number} midiNote
     */
    addActiveNote(midiNote) {
        this.state.keyboard.activeNotes.add(midiNote);
    }

    /**
     * Remove a note from active notes
     * @param {number} midiNote
     */
    removeActiveNote(midiNote) {
        this.state.keyboard.activeNotes.delete(midiNote);
    }

    /**
     * Check if a note is active
     * @param {number} midiNote
     * @returns {boolean}
     */
    isNoteActive(midiNote) {
        return this.state.keyboard.activeNotes.has(midiNote);
    }

    /**
     * Clear all active notes
     */
    clearActiveNotes() {
        this.state.keyboard.activeNotes.clear();
    }

    /**
     * Add swara to notation
     * @param {string} swara
     */
    addNotation(swara) {
        this.state.notation.captured.push(swara);
        eventBus.emit(EVENTS.NOTATION_ADD, swara);
    }

    /**
     * Clear notation
     */
    clearNotation() {
        this.state.notation.captured = [];
        eventBus.emit(EVENTS.NOTATION_CLEAR);
    }

    /**
     * Get notation as string
     * @returns {string}
     */
    getNotationString() {
        return this.state.notation.captured.join(' ');
    }

    /**
     * Persist settings to localStorage
     */
    persist() {
        const settings = {
            audio: {
                volume: this.state.audio.volume,
                reverb: this.state.audio.reverb,
                transpose: this.state.audio.transpose,
                octave: this.state.audio.octave,
                reedStack: this.state.audio.reedStack,
            },
            tutorial: {
                tempo: this.state.tutorial.tempo,
                mode: this.state.tutorial.mode,
            },
        };

        try {
            localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
        } catch (e) {
            console.warn('Failed to persist settings:', e);
        }
    }

    /**
     * Hydrate state from localStorage
     */
    hydrate() {
        try {
            const stored = localStorage.getItem(STORAGE_KEYS.SETTINGS);
            if (stored) {
                const settings = JSON.parse(stored);

                // Merge stored settings into state
                if (settings.audio) {
                    Object.assign(this.state.audio, settings.audio);
                }
                if (settings.tutorial) {
                    Object.assign(this.state.tutorial, settings.tutorial);
                }
            }
        } catch (e) {
            console.warn('Failed to hydrate settings:', e);
        }
    }

    /**
     * Reset state to initial values
     */
    reset() {
        this.state = JSON.parse(JSON.stringify(initialState));
        this.state.keyboard.activeNotes = new Set();
    }
}

// Create singleton instance
export const state = new StateManager();
export default state;
