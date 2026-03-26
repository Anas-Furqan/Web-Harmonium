// KeyHighlighter - Visual feedback and tutorial hints

import { eventBus, EVENTS } from '../utils/EventBus.js';

export class KeyHighlighter {
    constructor(keyboardRenderer) {
        this.renderer = keyboardRenderer;
        this.hintTimeouts = new Map();
    }

    /**
     * Show key pressed state
     */
    showPressed(midiNote) {
        const key = this.renderer.getKeyElement(midiNote);
        if (key) {
            key.classList.add('key--pressed');
        }
    }

    /**
     * Hide key pressed state
     */
    hidePressed(midiNote) {
        const key = this.renderer.getKeyElement(midiNote);
        if (key) {
            key.classList.remove('key--pressed');
        }
    }

    /**
     * Show hint highlight for tutorial
     */
    showHint(midiNote) {
        this.clearAllHints();
        const key = this.renderer.getKeyElement(midiNote);
        if (key) {
            key.classList.add('key--hint');
        }
    }

    /**
     * Show hints for multiple notes (chord)
     */
    showHints(midiNotes) {
        this.clearAllHints();
        midiNotes.forEach(note => {
            const key = this.renderer.getKeyElement(note);
            if (key) {
                key.classList.add('key--hint');
            }
        });
    }

    /**
     * Clear hint from a specific key
     */
    clearHint(midiNote) {
        const key = this.renderer.getKeyElement(midiNote);
        if (key) {
            key.classList.remove('key--hint');
        }
    }

    /**
     * Clear all hint highlights
     */
    clearAllHints() {
        const svg = this.renderer.svg;
        if (svg) {
            svg.querySelectorAll('.key--hint').forEach(el => {
                el.classList.remove('key--hint');
            });
        }
    }

    /**
     * Show correct note feedback (brief green flash)
     */
    showCorrect(midiNote) {
        const key = this.renderer.getKeyElement(midiNote);
        if (key) {
            key.classList.remove('key--hint');
            key.classList.add('key--correct');

            // Remove class after animation
            setTimeout(() => {
                key.classList.remove('key--correct');
            }, 300);

            eventBus.emit(EVENTS.TUTORIAL_CORRECT, midiNote);
        }
    }

    /**
     * Show wrong note feedback (brief red flash with shake)
     */
    showWrong(midiNote) {
        const key = this.renderer.getKeyElement(midiNote);
        if (key) {
            key.classList.add('key--wrong');

            // Remove class after animation
            setTimeout(() => {
                key.classList.remove('key--wrong');
            }, 300);

            eventBus.emit(EVENTS.TUTORIAL_WRONG, midiNote);
        }
    }

    /**
     * Clear all visual states from all keys
     */
    clearAll() {
        const svg = this.renderer.svg;
        if (svg) {
            svg.querySelectorAll('.key').forEach(el => {
                el.classList.remove('key--pressed', 'key--hint', 'key--correct', 'key--wrong');
            });
        }
    }

    /**
     * Pulse a key briefly (for demo/attract mode)
     */
    pulse(midiNote, duration = 200) {
        const key = this.renderer.getKeyElement(midiNote);
        if (key) {
            key.classList.add('key--pressed');
            setTimeout(() => {
                key.classList.remove('key--pressed');
            }, duration);
        }
    }

    /**
     * Play a visual sequence (for demo)
     */
    async playSequence(notes, interval = 300) {
        for (const note of notes) {
            this.pulse(note, interval * 0.8);
            await new Promise(resolve => setTimeout(resolve, interval));
        }
    }
}

export default KeyHighlighter;
