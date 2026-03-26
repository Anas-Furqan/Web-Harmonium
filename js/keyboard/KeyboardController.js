// KeyboardController - Unified input handling for mouse, touch, and keyboard

import { KEY_MAP, midiToSwara } from '../config.js';
import { eventBus, EVENTS } from '../utils/EventBus.js';
import { state } from '../utils/StateManager.js';

export class KeyboardController {
    constructor(audioEngine, keyboardRenderer, keyHighlighter) {
        this.audio = audioEngine;
        this.renderer = keyboardRenderer;
        this.highlighter = keyHighlighter;

        this.pressedKeys = new Set(); // Track pressed computer keys
        this.touchMap = new Map();    // Touch ID -> MIDI note
        this.mouseNote = null;        // Currently pressed mouse note

        this.onNoteOn = null;  // Callback for tutorial validation
        this.onNoteOff = null;
    }

    /**
     * Initialize all event listeners
     */
    init() {
        // Computer keyboard events
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        document.addEventListener('keyup', this.handleKeyUp.bind(this));

        // Mouse events on SVG
        const svg = this.renderer.svg;
        if (svg) {
            svg.addEventListener('mousedown', this.handleMouseDown.bind(this));
            svg.addEventListener('mouseup', this.handleMouseUp.bind(this));
            svg.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
            svg.addEventListener('mousemove', this.handleMouseMove.bind(this));

            // Touch events
            svg.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
            svg.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
            svg.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
            svg.addEventListener('touchcancel', this.handleTouchEnd.bind(this), { passive: false });
        }

        // Prevent context menu on keyboard area
        svg?.addEventListener('contextmenu', e => e.preventDefault());

        console.log('Keyboard controller initialized');
    }

    /**
     * Handle computer keyboard key down
     */
    handleKeyDown(event) {
        // Ignore if typing in an input
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
            return;
        }

        // Ignore repeat events
        if (event.repeat) return;

        const midiNote = KEY_MAP[event.code];
        if (midiNote !== undefined) {
            event.preventDefault();
            this.pressedKeys.add(event.code);
            this.triggerNoteOn(midiNote, 100);
        }
    }

    /**
     * Handle computer keyboard key up
     */
    handleKeyUp(event) {
        const midiNote = KEY_MAP[event.code];
        if (midiNote !== undefined && this.pressedKeys.has(event.code)) {
            event.preventDefault();
            this.pressedKeys.delete(event.code);
            this.triggerNoteOff(midiNote);
        }
    }

    /**
     * Handle mouse down on keyboard
     */
    handleMouseDown(event) {
        if (event.button !== 0) return; // Only left click

        const midiNote = this.getNoteFromEvent(event);
        if (midiNote !== null) {
            this.mouseNote = midiNote;
            this.triggerNoteOn(midiNote, 100);
        }
    }

    /**
     * Handle mouse up
     */
    handleMouseUp(event) {
        if (this.mouseNote !== null) {
            this.triggerNoteOff(this.mouseNote);
            this.mouseNote = null;
        }
    }

    /**
     * Handle mouse leaving keyboard area
     */
    handleMouseLeave(event) {
        if (this.mouseNote !== null) {
            this.triggerNoteOff(this.mouseNote);
            this.mouseNote = null;
        }
    }

    /**
     * Handle mouse move for glissando
     */
    handleMouseMove(event) {
        if (this.mouseNote === null || event.buttons !== 1) return;

        const newNote = this.getNoteFromEvent(event);
        if (newNote !== null && newNote !== this.mouseNote) {
            // Glissando - note changed while dragging
            this.triggerNoteOff(this.mouseNote);
            this.mouseNote = newNote;
            this.triggerNoteOn(newNote, 100);
        }
    }

    /**
     * Handle touch start
     */
    handleTouchStart(event) {
        event.preventDefault();

        for (const touch of event.changedTouches) {
            const midiNote = this.getNoteFromPoint(touch.clientX, touch.clientY);
            if (midiNote !== null) {
                this.touchMap.set(touch.identifier, midiNote);
                this.triggerNoteOn(midiNote, 100);
            }
        }
    }

    /**
     * Handle touch move (glissando)
     */
    handleTouchMove(event) {
        event.preventDefault();

        for (const touch of event.changedTouches) {
            const currentNote = this.touchMap.get(touch.identifier);
            const newNote = this.getNoteFromPoint(touch.clientX, touch.clientY);

            if (newNote !== currentNote) {
                // Note changed - glissando
                if (currentNote !== undefined) {
                    this.triggerNoteOff(currentNote);
                }
                if (newNote !== null) {
                    this.touchMap.set(touch.identifier, newNote);
                    this.triggerNoteOn(newNote, 100);
                } else {
                    this.touchMap.delete(touch.identifier);
                }
            }
        }
    }

    /**
     * Handle touch end
     */
    handleTouchEnd(event) {
        for (const touch of event.changedTouches) {
            const midiNote = this.touchMap.get(touch.identifier);
            if (midiNote !== undefined) {
                this.triggerNoteOff(midiNote);
                this.touchMap.delete(touch.identifier);
            }
        }
    }

    /**
     * Get MIDI note from mouse/touch event
     */
    getNoteFromEvent(event) {
        const target = event.target.closest('[data-midi]');
        if (target) {
            return parseInt(target.dataset.midi, 10);
        }
        return null;
    }

    /**
     * Get MIDI note from screen coordinates
     */
    getNoteFromPoint(clientX, clientY) {
        const element = document.elementFromPoint(clientX, clientY);
        const keyGroup = element?.closest('[data-midi]');
        if (keyGroup) {
            return parseInt(keyGroup.dataset.midi, 10);
        }
        return null;
    }

    /**
     * Trigger note on with all side effects
     */
    triggerNoteOn(midiNote, velocity = 100) {
        // Check if already playing
        if (state.isNoteActive(midiNote)) return;

        // Update state
        state.addActiveNote(midiNote);

        // Play audio
        this.audio.noteOn(midiNote, velocity);

        // Visual feedback
        this.highlighter.showPressed(midiNote);

        // Add to notation
        const swara = midiToSwara(midiNote);
        state.addNotation(swara);

        // Callback for tutorial
        if (this.onNoteOn) {
            this.onNoteOn(midiNote, swara);
        }

        eventBus.emit(EVENTS.KEY_PRESS, midiNote);
    }

    /**
     * Trigger note off with all side effects
     */
    triggerNoteOff(midiNote) {
        // Check if actually playing
        if (!state.isNoteActive(midiNote)) return;

        // Update state
        state.removeActiveNote(midiNote);

        // Stop audio
        this.audio.noteOff(midiNote);

        // Visual feedback
        this.highlighter.hidePressed(midiNote);

        // Callback for tutorial
        if (this.onNoteOff) {
            this.onNoteOff(midiNote);
        }

        eventBus.emit(EVENTS.KEY_RELEASE, midiNote);
    }

    /**
     * Stop all notes (panic button)
     */
    allNotesOff() {
        // Stop all audio
        this.audio.allNotesOff();

        // Clear visual states
        this.highlighter.clearAll();

        // Clear state
        state.clearActiveNotes();

        // Clear tracking
        this.pressedKeys.clear();
        this.touchMap.clear();
        this.mouseNote = null;
    }

    /**
     * Set callback for note on (for tutorial)
     */
    setNoteOnCallback(callback) {
        this.onNoteOn = callback;
    }

    /**
     * Set callback for note off (for tutorial)
     */
    setNoteOffCallback(callback) {
        this.onNoteOff = callback;
    }

    /**
     * Clear callbacks
     */
    clearCallbacks() {
        this.onNoteOn = null;
        this.onNoteOff = null;
    }
}

export default KeyboardController;
