// EventBus - Simple pub/sub event system

class EventBus {
    constructor() {
        this.events = new Map();
    }

    /**
     * Subscribe to an event
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     * @returns {Function} Unsubscribe function
     */
    on(event, callback) {
        if (!this.events.has(event)) {
            this.events.set(event, new Set());
        }
        this.events.get(event).add(callback);

        // Return unsubscribe function
        return () => this.off(event, callback);
    }

    /**
     * Subscribe to an event (one-time)
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    once(event, callback) {
        const wrapper = (...args) => {
            this.off(event, wrapper);
            callback(...args);
        };
        this.on(event, wrapper);
    }

    /**
     * Unsubscribe from an event
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    off(event, callback) {
        if (this.events.has(event)) {
            this.events.get(event).delete(callback);
        }
    }

    /**
     * Emit an event
     * @param {string} event - Event name
     * @param {...any} args - Arguments to pass to callbacks
     */
    emit(event, ...args) {
        if (this.events.has(event)) {
            this.events.get(event).forEach(callback => {
                try {
                    callback(...args);
                } catch (error) {
                    console.error(`Error in event handler for "${event}":`, error);
                }
            });
        }
    }

    /**
     * Clear all subscribers for an event (or all events)
     * @param {string} [event] - Optional event name
     */
    clear(event) {
        if (event) {
            this.events.delete(event);
        } else {
            this.events.clear();
        }
    }
}

// Event names constants
export const EVENTS = {
    // Audio events
    NOTE_ON: 'note:on',
    NOTE_OFF: 'note:off',
    VOLUME_CHANGE: 'audio:volume',
    REVERB_CHANGE: 'audio:reverb',
    TRANSPOSE_CHANGE: 'audio:transpose',
    OCTAVE_CHANGE: 'audio:octave',
    REED_CHANGE: 'audio:reed',
    AUDIO_READY: 'audio:ready',

    // Keyboard events
    KEY_PRESS: 'keyboard:press',
    KEY_RELEASE: 'keyboard:release',

    // Tutorial events
    TUTORIAL_START: 'tutorial:start',
    TUTORIAL_STOP: 'tutorial:stop',
    TUTORIAL_STEP: 'tutorial:step',
    TUTORIAL_COMPLETE: 'tutorial:complete',
    TUTORIAL_HINT: 'tutorial:hint',
    TUTORIAL_CORRECT: 'tutorial:correct',
    TUTORIAL_WRONG: 'tutorial:wrong',
    TEMPO_CHANGE: 'tutorial:tempo',
    MODE_CHANGE: 'tutorial:mode',

    // Notation events
    NOTATION_ADD: 'notation:add',
    NOTATION_CLEAR: 'notation:clear',

    // UI events
    PANEL_CHANGE: 'ui:panel',
    LOADING_COMPLETE: 'ui:loaded',

    // State events
    STATE_CHANGE: 'state:change',
};

// Create singleton instance
export const eventBus = new EventBus();
export default eventBus;
