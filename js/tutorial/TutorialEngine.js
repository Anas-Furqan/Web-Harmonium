// TutorialEngine - Tutorial state machine for loading, validation, and progression

import { eventBus, EVENTS } from '../utils/EventBus.js';
import { state } from '../utils/StateManager.js';
import { TUTORIAL_MODES, midiToSwara, getKeyDisplayForNote } from '../config.js';

export class TutorialEngine {
    constructor(keyHighlighter) {
        this.highlighter = keyHighlighter;
        this.catalog = null;
        this.currentTutorial = null;
        this.stepIndex = 0;
        this.isActive = false;
        this.score = 0;
        this.mistakes = 0;
    }

    /**
     * Load the tutorial catalog
     */
    async loadCatalog() {
        try {
            const response = await fetch('tutorials/index.json');
            if (!response.ok) throw new Error('Failed to load catalog');
            this.catalog = await response.json();
            console.log('Tutorial catalog loaded:', this.catalog.tutorials.length, 'tutorials');
            return this.catalog;
        } catch (error) {
            console.error('Failed to load tutorial catalog:', error);
            return null;
        }
    }

    /**
     * Get tutorials filtered by category
     */
    getTutorials(category = 'all') {
        if (!this.catalog) return [];

        if (category === 'all') {
            return this.catalog.tutorials;
        }
        return this.catalog.tutorials.filter(t => t.category === category);
    }

    /**
     * Load a specific tutorial
     */
    async loadTutorial(tutorialId) {
        const tutorialInfo = this.catalog?.tutorials.find(t => t.id === tutorialId);
        if (!tutorialInfo) {
            console.error('Tutorial not found:', tutorialId);
            return null;
        }

        try {
            const response = await fetch(`tutorials/${tutorialInfo.file}`);
            if (!response.ok) throw new Error('Failed to load tutorial');
            this.currentTutorial = await response.json();
            console.log('Tutorial loaded:', this.currentTutorial.meta.title);
            return this.currentTutorial;
        } catch (error) {
            console.error('Failed to load tutorial:', error);
            return null;
        }
    }

    /**
     * Start the current tutorial
     */
    start() {
        if (!this.currentTutorial) {
            console.error('No tutorial loaded');
            return false;
        }

        this.stepIndex = 0;
        this.score = 0;
        this.mistakes = 0;
        this.isActive = true;

        // Update state
        state.set('tutorial.active', true);
        state.set('tutorial.currentSong', this.currentTutorial.id);
        state.set('tutorial.currentStep', 0);
        state.set('tutorial.totalSteps', this.currentTutorial.notes.length);
        state.set('tutorial.score', 0);
        state.set('tutorial.mistakes', 0);

        // Show first hint
        this.showCurrentHint();

        eventBus.emit(EVENTS.TUTORIAL_START, this.currentTutorial);
        return true;
    }

    /**
     * Stop the tutorial
     */
    stop() {
        this.isActive = false;
        this.highlighter?.clearAllHints();

        state.set('tutorial.active', false);
        state.set('tutorial.currentSong', null);

        eventBus.emit(EVENTS.TUTORIAL_STOP);
    }

    /**
     * Reset to beginning
     */
    reset() {
        this.stepIndex = 0;
        this.score = 0;
        this.mistakes = 0;

        state.set('tutorial.currentStep', 0);
        state.set('tutorial.score', 0);
        state.set('tutorial.mistakes', 0);

        if (this.isActive) {
            this.showCurrentHint();
        }
    }

    /**
     * Validate a played note
     */
    validateNote(midiNote) {
        if (!this.isActive || !this.currentTutorial) return null;

        const currentNote = this.getCurrentNote();
        if (!currentNote) return null;

        const mode = state.get('tutorial.mode');
        const expectedMidi = currentNote.midi;

        if (midiNote === expectedMidi) {
            // Correct note!
            this.score++;
            state.set('tutorial.score', this.score);

            this.highlighter?.showCorrect(midiNote);

            // Advance to next step
            this.advanceStep();

            return { correct: true, note: currentNote };
        } else {
            // Wrong note
            if (mode === TUTORIAL_MODES.PRACTICE || mode === TUTORIAL_MODES.WAIT) {
                this.mistakes++;
                state.set('tutorial.mistakes', this.mistakes);
                this.highlighter?.showWrong(midiNote);
            }

            return { correct: false, expected: currentNote, played: midiNote };
        }
    }

    /**
     * Advance to next step
     */
    advanceStep() {
        this.stepIndex++;

        if (this.stepIndex >= this.currentTutorial.notes.length) {
            // Tutorial complete!
            this.complete();
            return;
        }

        state.set('tutorial.currentStep', this.stepIndex);
        this.showCurrentHint();

        eventBus.emit(EVENTS.TUTORIAL_STEP, {
            step: this.stepIndex,
            total: this.currentTutorial.notes.length,
            note: this.getCurrentNote()
        });
    }

    /**
     * Complete the tutorial
     */
    complete() {
        this.isActive = false;
        this.highlighter?.clearAllHints();

        const accuracy = this.currentTutorial.notes.length > 0
            ? Math.round((this.score / this.currentTutorial.notes.length) * 100)
            : 0;

        eventBus.emit(EVENTS.TUTORIAL_COMPLETE, {
            score: this.score,
            mistakes: this.mistakes,
            total: this.currentTutorial.notes.length,
            accuracy
        });
    }

    /**
     * Show hint for current note
     */
    showCurrentHint() {
        const currentNote = this.getCurrentNote();
        if (!currentNote) return;

        this.highlighter?.showHint(currentNote.midi);

        eventBus.emit(EVENTS.TUTORIAL_HINT, {
            swara: currentNote.swara,
            midi: currentNote.midi,
            key: getKeyDisplayForNote(currentNote.midi),
            lyrics: currentNote.lyrics
        });
    }

    /**
     * Get current note
     */
    getCurrentNote() {
        if (!this.currentTutorial || this.stepIndex >= this.currentTutorial.notes.length) {
            return null;
        }
        return this.currentTutorial.notes[this.stepIndex];
    }

    /**
     * Get progress info
     */
    getProgress() {
        if (!this.currentTutorial) {
            return { current: 0, total: 0, percentage: 0 };
        }
        const total = this.currentTutorial.notes.length;
        const current = this.stepIndex;
        const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
        return { current, total, percentage };
    }

    /**
     * Get current tutorial info
     */
    getTutorialInfo() {
        if (!this.currentTutorial) return null;
        return {
            ...this.currentTutorial.meta,
            id: this.currentTutorial.id
        };
    }

    /**
     * Check if tutorial is active
     */
    get active() {
        return this.isActive;
    }
}

export default TutorialEngine;
