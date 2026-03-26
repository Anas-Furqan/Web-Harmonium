// App.js - Main entry point and initialization

import { state } from './utils/StateManager.js';
import { eventBus, EVENTS } from './utils/EventBus.js';
import { AudioEngine } from './audio/AudioEngine.js';
import { MidiHandler } from './audio/MidiHandler.js';
import { KeyboardRenderer } from './keyboard/KeyboardRenderer.js';
import { KeyboardController } from './keyboard/KeyboardController.js';
import { KeyHighlighter } from './keyboard/KeyHighlighter.js';
import { TutorialEngine } from './tutorial/TutorialEngine.js';
import { TutorialUI } from './tutorial/TutorialUI.js';
import { TutorialPlayer } from './tutorial/TutorialPlayer.js';
import { NotationDisplay } from './notation/NotationDisplay.js';

class WebHarmoniumApp {
    constructor() {
        this.audio = null;
        this.midi = null;
        this.renderer = null;
        this.controller = null;
        this.highlighter = null;
        this.tutorialEngine = null;
        this.tutorialUI = null;
        this.tutorialPlayer = null;
        this.notationDisplay = null;
        this.isInitialized = false;
    }

    /**
     * Initialize the application
     */
    async init() {
        console.log('Initializing Web Harmonium...');

        // Hydrate settings from localStorage
        state.hydrate();

        // Create audio engine
        this.audio = new AudioEngine();

        // Render keyboard
        const container = document.getElementById('keyboard-container');
        this.renderer = new KeyboardRenderer(container);
        this.renderer.render();

        // Create highlighter
        this.highlighter = new KeyHighlighter(this.renderer);

        // Create tutorial engine (before audio init for catalog loading)
        this.tutorialEngine = new TutorialEngine(this.highlighter);

        // Create tutorial UI
        this.tutorialUI = new TutorialUI(this.tutorialEngine);
        this.tutorialUI.init();

        // Wait for user gesture to initialize audio
        this.showAudioPrompt();

        // Setup UI controls
        this.setupControls();

        // Setup panel navigation
        this.setupPanelNavigation();

        // Setup notation display
        this.setupNotation();

        console.log('UI initialized, waiting for user gesture...');
    }

    /**
     * Show audio prompt and wait for user interaction
     */
    showAudioPrompt() {
        const overlay = document.getElementById('loading-overlay');
        const audioPrompt = document.getElementById('audio-prompt');

        // Hide loading, show audio prompt
        overlay?.classList.add('hidden');
        audioPrompt?.classList.remove('hidden');

        // Initialize audio on any user interaction
        const initAudio = async (event) => {
            event.preventDefault();

            // Initialize audio engine
            const success = await this.audio.init();

            if (success) {
                // Create controller now that audio is ready
                this.controller = new KeyboardController(
                    this.audio,
                    this.renderer,
                    this.highlighter
                );
                this.controller.init();

                // Setup tutorial validation callback
                this.controller.setNoteOnCallback((midiNote, swara) => {
                    if (this.tutorialEngine?.active) {
                        this.tutorialEngine.validateNote(midiNote);
                    }
                });

                // Create tutorial player
                this.tutorialPlayer = new TutorialPlayer(
                    this.tutorialEngine,
                    this.audio,
                    this.highlighter
                );
                this.tutorialPlayer.init();

                // Initialize MIDI handler
                this.midi = new MidiHandler(this.audio, this.controller);
                await this.midi.init();

                // Hide prompt
                audioPrompt?.classList.add('hidden');

                // Update UI with current state
                this.updateControlsUI();

                this.isInitialized = true;
                eventBus.emit(EVENTS.LOADING_COMPLETE);
                console.log('Web Harmonium ready!');
            } else {
                console.error('Failed to initialize audio');
                const content = audioPrompt?.querySelector('p') || audioPrompt?.querySelector('.audio-prompt__content p');
                if (content) {
                    content.textContent = 'Audio initialization failed. Please refresh.';
                }
            }

            // Remove listeners
            document.removeEventListener('click', initAudio);
            document.removeEventListener('touchstart', initAudio);
            document.removeEventListener('keydown', initAudio);
        };

        document.addEventListener('click', initAudio);
        document.addEventListener('touchstart', initAudio);
        document.addEventListener('keydown', initAudio);
    }

    /**
     * Setup control panel UI
     */
    setupControls() {
        // Volume slider
        const volumeSlider = document.getElementById('volume-slider');
        const volumeValue = document.getElementById('volume-value');

        volumeSlider?.addEventListener('input', (e) => {
            const value = e.target.value / 100;
            this.audio?.setVolume(value);
            volumeValue.textContent = `${e.target.value}%`;
            state.persist();
        });

        // Reverb toggle
        const reverbToggle = document.getElementById('reverb-toggle');
        const reverbLabel = document.getElementById('reverb-label');

        reverbToggle?.addEventListener('change', (e) => {
            this.audio?.setReverb(e.target.checked);
            reverbLabel.textContent = e.target.checked ? 'On' : 'Off';
            state.persist();
        });

        // Transpose controls
        const transposeDown = document.getElementById('transpose-down');
        const transposeUp = document.getElementById('transpose-up');
        const transposeValue = document.getElementById('transpose-value');

        transposeDown?.addEventListener('click', () => {
            const current = state.get('audio.transpose');
            if (current > -11) {
                this.audio?.setTranspose(current - 1);
                transposeValue.textContent = state.get('audio.transpose');
                state.persist();
            }
        });

        transposeUp?.addEventListener('click', () => {
            const current = state.get('audio.transpose');
            if (current < 11) {
                this.audio?.setTranspose(current + 1);
                transposeValue.textContent = state.get('audio.transpose');
                state.persist();
            }
        });

        // Octave controls
        const octaveDown = document.getElementById('octave-down');
        const octaveUp = document.getElementById('octave-up');
        const octaveValue = document.getElementById('octave-value');

        octaveDown?.addEventListener('click', () => {
            const current = state.get('audio.octave');
            if (current > 0) {
                this.audio?.setOctave(current - 1);
                octaveValue.textContent = state.get('audio.octave');
                state.persist();
            }
        });

        octaveUp?.addEventListener('click', () => {
            const current = state.get('audio.octave');
            if (current < 6) {
                this.audio?.setOctave(current + 1);
                octaveValue.textContent = state.get('audio.octave');
                state.persist();
            }
        });

        // Reed stack controls
        const reedDown = document.getElementById('reed-down');
        const reedUp = document.getElementById('reed-up');
        const reedValue = document.getElementById('reed-value');

        reedDown?.addEventListener('click', () => {
            const current = state.get('audio.reedStack');
            if (current > 1) {
                this.audio?.setReedStack(current - 1);
                reedValue.textContent = state.get('audio.reedStack');
                state.persist();
            }
        });

        reedUp?.addEventListener('click', () => {
            const current = state.get('audio.reedStack');
            if (current < 3) {
                this.audio?.setReedStack(current + 1);
                reedValue.textContent = state.get('audio.reedStack');
                state.persist();
            }
        });
    }

    /**
     * Update controls UI to match current state
     */
    updateControlsUI() {
        const volume = Math.round(state.get('audio.volume') * 100);
        const reverb = state.get('audio.reverb');
        const transpose = state.get('audio.transpose');
        const octave = state.get('audio.octave');
        const reedStack = state.get('audio.reedStack');

        const volumeSlider = document.getElementById('volume-slider');
        const volumeDisplay = document.getElementById('volume-value');
        const reverbToggle = document.getElementById('reverb-toggle');
        const reverbLabel = document.getElementById('reverb-label');
        const transposeDisplay = document.getElementById('transpose-value');
        const octaveDisplay = document.getElementById('octave-value');
        const reedDisplay = document.getElementById('reed-value');

        if (volumeSlider) volumeSlider.value = volume;
        if (volumeDisplay) volumeDisplay.textContent = `${volume}%`;
        if (reverbToggle) reverbToggle.checked = reverb;
        if (reverbLabel) reverbLabel.textContent = reverb ? 'On' : 'Off';
        if (transposeDisplay) transposeDisplay.textContent = transpose;
        if (octaveDisplay) octaveDisplay.textContent = octave;
        if (reedDisplay) reedDisplay.textContent = reedStack;
    }

    /**
     * Setup panel navigation
     */
    setupPanelNavigation() {
        const navButtons = document.querySelectorAll('.nav-btn');
        const panels = {
            controls: document.getElementById('controls-panel'),
            tutorial: document.getElementById('tutorial-panel'),
            notation: document.getElementById('notation-panel'),
        };

        navButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const panelId = btn.dataset.panel;

                // Update nav button states
                navButtons.forEach(b => b.classList.remove('nav-btn--active'));
                btn.classList.add('nav-btn--active');

                // Show/hide panels
                Object.entries(panels).forEach(([id, panel]) => {
                    if (panel) {
                        panel.classList.toggle('hidden', id !== panelId);
                    }
                });

                // Enable tutorial mode on keyboard when tutorial panel is active
                if (panelId === 'tutorial') {
                    this.renderer?.enableTutorialMode();
                } else {
                    this.renderer?.disableTutorialMode();
                }

                state.set('ui.currentPanel', panelId);
                eventBus.emit(EVENTS.PANEL_CHANGE, panelId);
            });
        });
    }

    /**
     * Setup notation display
     */
    setupNotation() {
        const displayElement = document.getElementById('notation-display');
        const clearBtn = document.getElementById('notation-clear');
        const copyBtn = document.getElementById('notation-copy');

        // Create notation display module
        this.notationDisplay = new NotationDisplay(displayElement);
        this.notationDisplay.init();

        // Clear button
        clearBtn?.addEventListener('click', () => {
            state.clearNotation();
        });

        // Copy button
        copyBtn?.addEventListener('click', async () => {
            const notation = state.getNotationString();
            if (notation) {
                try {
                    await navigator.clipboard.writeText(notation);
                    copyBtn.textContent = 'Copied!';
                    setTimeout(() => {
                        copyBtn.textContent = 'Copy';
                    }, 1500);
                } catch (e) {
                    console.error('Failed to copy:', e);
                }
            }
        });
    }
}

// Register service worker for PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            console.log('Service Worker registered:', registration.scope);
        } catch (error) {
            console.warn('Service Worker registration failed:', error);
        }
    });
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new WebHarmoniumApp();
    app.init();

    // Expose to window for debugging
    window.harmonium = app;
});
