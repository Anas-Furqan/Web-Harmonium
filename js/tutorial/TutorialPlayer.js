// TutorialPlayer - Handles autoplay and tempo-based playback

import { eventBus, EVENTS } from '../utils/EventBus.js';
import { state } from '../utils/StateManager.js';
import { TUTORIAL_MODES } from '../config.js';

export class TutorialPlayer {
    constructor(tutorialEngine, audioEngine, keyHighlighter) {
        this.engine = tutorialEngine;
        this.audio = audioEngine;
        this.highlighter = keyHighlighter;

        this.isPlaying = false;
        this.playbackTimer = null;
        this.currentNoteIndex = 0;
    }

    /**
     * Initialize player
     */
    init() {
        // Listen for mode changes
        eventBus.on(EVENTS.MODE_CHANGE, (mode) => {
            if (mode === TUTORIAL_MODES.AUTOPLAY && this.engine.active) {
                this.startAutoplay();
            } else {
                this.stopAutoplay();
            }
        });

        // Listen for tutorial events
        eventBus.on(EVENTS.TUTORIAL_START, () => {
            const mode = state.get('tutorial.mode');
            if (mode === TUTORIAL_MODES.AUTOPLAY) {
                this.startAutoplay();
            }
        });

        eventBus.on(EVENTS.TUTORIAL_STOP, () => {
            this.stopAutoplay();
        });

        eventBus.on(EVENTS.TUTORIAL_COMPLETE, () => {
            this.stopAutoplay();
        });
    }

    /**
     * Start autoplay mode
     */
    startAutoplay() {
        if (this.isPlaying) return;
        if (!this.engine.currentTutorial) return;

        this.isPlaying = true;
        this.currentNoteIndex = state.get('tutorial.currentStep') || 0;
        this.scheduleNextNote();
    }

    /**
     * Stop autoplay
     */
    stopAutoplay() {
        this.isPlaying = false;
        if (this.playbackTimer) {
            clearTimeout(this.playbackTimer);
            this.playbackTimer = null;
        }
        this.audio?.allNotesOff();
    }

    /**
     * Schedule the next note in autoplay
     */
    scheduleNextNote() {
        if (!this.isPlaying || !this.engine.currentTutorial) return;

        const notes = this.engine.currentTutorial.notes;
        if (this.currentNoteIndex >= notes.length) {
            // Playback complete
            this.stopAutoplay();
            this.engine.complete();
            return;
        }

        const note = notes[this.currentNoteIndex];
        const tempo = state.get('tutorial.tempo') || 80;

        // Calculate duration in ms (duration is in beats, tempo is BPM)
        const beatDuration = 60000 / tempo;
        const noteDuration = (note.duration || 1) * beatDuration;

        // Play the note
        this.playNote(note);

        // Update engine state
        state.set('tutorial.currentStep', this.currentNoteIndex);

        // Show hint
        this.highlighter?.showHint(note.midi);

        // Emit step event
        eventBus.emit(EVENTS.TUTORIAL_STEP, {
            step: this.currentNoteIndex,
            total: notes.length,
            note
        });

        // Emit hint event
        eventBus.emit(EVENTS.TUTORIAL_HINT, {
            swara: note.swara,
            midi: note.midi,
            lyrics: note.lyrics
        });

        // Schedule next note
        this.currentNoteIndex++;
        this.playbackTimer = setTimeout(() => {
            this.stopNote(note);
            this.scheduleNextNote();
        }, noteDuration);
    }

    /**
     * Play a single note
     */
    playNote(note) {
        if (note.rest) return; // Skip rests

        this.audio?.noteOn(note.midi, 80);
        this.highlighter?.showPressed(note.midi);

        // Handle chords
        if (note.chord && Array.isArray(note.chord)) {
            note.chord.forEach(midiNote => {
                this.audio?.noteOn(midiNote, 70);
                this.highlighter?.showPressed(midiNote);
            });
        }
    }

    /**
     * Stop a note
     */
    stopNote(note) {
        if (note.rest) return;

        this.audio?.noteOff(note.midi);
        this.highlighter?.hidePressed(note.midi);

        // Handle chords
        if (note.chord && Array.isArray(note.chord)) {
            note.chord.forEach(midiNote => {
                this.audio?.noteOff(midiNote);
                this.highlighter?.hidePressed(midiNote);
            });
        }
    }

    /**
     * Play a demo sequence (for preview)
     */
    async playDemo(notes, tempo = 80) {
        const beatDuration = 60000 / tempo;

        for (let i = 0; i < notes.length && i < 8; i++) {
            const note = notes[i];
            if (note.rest) continue;

            const duration = (note.duration || 1) * beatDuration;

            this.audio?.noteOn(note.midi, 70);
            this.highlighter?.pulse(note.midi, duration * 0.8);

            await this.wait(duration);
            this.audio?.noteOff(note.midi);
        }
    }

    /**
     * Utility: wait for ms
     */
    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Check if currently playing
     */
    get playing() {
        return this.isPlaying;
    }
}

export default TutorialPlayer;
