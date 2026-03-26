// TutorialUI - Tutorial panel rendering and user interaction

import { eventBus, EVENTS } from '../utils/EventBus.js';
import { state } from '../utils/StateManager.js';
import { TUTORIAL_MODES, DIFFICULTY_LEVELS } from '../config.js';

export class TutorialUI {
    constructor(tutorialEngine) {
        this.engine = tutorialEngine;
        this.elements = {};
    }

    /**
     * Initialize UI elements and event listeners
     */
    init() {
        // Cache DOM elements
        this.elements = {
            browser: document.getElementById('tutorial-browser'),
            player: document.getElementById('tutorial-player'),
            list: document.getElementById('tutorial-list'),
            title: document.getElementById('tutorial-title'),
            artist: document.getElementById('tutorial-artist'),
            progressFill: document.getElementById('progress-fill'),
            progressText: document.getElementById('progress-text'),
            hintNote: document.getElementById('hint-note'),
            hintKey: document.getElementById('hint-key'),
            lyrics: document.getElementById('tutorial-lyrics'),
            tempoValue: document.getElementById('tempo-value'),
            restartBtn: document.getElementById('tutorial-restart'),
            exitBtn: document.getElementById('tutorial-exit'),
            tempoDown: document.getElementById('tempo-down'),
            tempoUp: document.getElementById('tempo-up'),
        };

        // Setup category filters
        this.setupCategoryFilters();

        // Setup control buttons
        this.setupControls();

        // Setup mode radios
        this.setupModeRadios();

        // Listen to engine events
        this.setupEventListeners();

        // Load and display tutorials
        this.loadTutorialList();
    }

    /**
     * Setup category filter buttons
     */
    setupCategoryFilters() {
        const categoryBtns = document.querySelectorAll('.category-btn');
        categoryBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                // Update active state
                categoryBtns.forEach(b => b.classList.remove('category-btn--active'));
                btn.classList.add('category-btn--active');

                // Filter tutorials
                const category = btn.dataset.category;
                this.renderTutorialList(category);
            });
        });
    }

    /**
     * Setup control buttons
     */
    setupControls() {
        // Restart button
        this.elements.restartBtn?.addEventListener('click', () => {
            this.engine.reset();
        });

        // Exit button
        this.elements.exitBtn?.addEventListener('click', () => {
            this.engine.stop();
            this.showBrowser();
        });

        // Tempo controls
        this.elements.tempoDown?.addEventListener('click', () => {
            const current = state.get('tutorial.tempo');
            if (current > 30) {
                state.set('tutorial.tempo', current - 5);
                this.updateTempoDisplay();
            }
        });

        this.elements.tempoUp?.addEventListener('click', () => {
            const current = state.get('tutorial.tempo');
            if (current < 200) {
                state.set('tutorial.tempo', current + 5);
                this.updateTempoDisplay();
            }
        });
    }

    /**
     * Setup mode radio buttons
     */
    setupModeRadios() {
        const radios = document.querySelectorAll('input[name="tutorial-mode"]');
        radios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                state.set('tutorial.mode', e.target.value);
                eventBus.emit(EVENTS.MODE_CHANGE, e.target.value);
            });
        });

        // Set initial value from state
        const currentMode = state.get('tutorial.mode');
        const radio = document.querySelector(`input[name="tutorial-mode"][value="${currentMode}"]`);
        if (radio) radio.checked = true;
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Tutorial started
        eventBus.on(EVENTS.TUTORIAL_START, (tutorial) => {
            this.showPlayer();
            this.updateInfo(tutorial);
            this.updateProgress();
        });

        // Tutorial stopped
        eventBus.on(EVENTS.TUTORIAL_STOP, () => {
            this.showBrowser();
        });

        // Step advanced
        eventBus.on(EVENTS.TUTORIAL_STEP, () => {
            this.updateProgress();
        });

        // Hint shown
        eventBus.on(EVENTS.TUTORIAL_HINT, (hint) => {
            this.updateHint(hint);
        });

        // Tutorial complete
        eventBus.on(EVENTS.TUTORIAL_COMPLETE, (result) => {
            this.showCompletion(result);
        });
    }

    /**
     * Load tutorial list from engine
     */
    async loadTutorialList() {
        await this.engine.loadCatalog();
        this.renderTutorialList('all');
    }

    /**
     * Render tutorial list
     */
    renderTutorialList(category = 'all') {
        const tutorials = this.engine.getTutorials(category);
        const list = this.elements.list;

        if (!list) return;

        if (tutorials.length === 0) {
            list.innerHTML = '<p class="tutorial-list__empty">No tutorials found</p>';
            return;
        }

        list.innerHTML = tutorials.map(tutorial => `
            <div class="tutorial-card" data-id="${tutorial.id}">
                <span class="tutorial-card__title">${tutorial.title}</span>
                <div class="tutorial-card__meta">
                    <span class="tutorial-card__artist">${tutorial.artist}</span>
                    <span class="tutorial-card__badge tutorial-card__badge--${tutorial.difficulty}">
                        ${tutorial.difficulty}
                    </span>
                </div>
            </div>
        `).join('');

        // Add click handlers
        list.querySelectorAll('.tutorial-card').forEach(card => {
            card.addEventListener('click', () => {
                this.selectTutorial(card.dataset.id);
            });
        });
    }

    /**
     * Select and start a tutorial
     */
    async selectTutorial(tutorialId) {
        const tutorial = await this.engine.loadTutorial(tutorialId);
        if (tutorial) {
            // Set tempo from tutorial default
            if (tutorial.meta.defaultTempo) {
                state.set('tutorial.tempo', tutorial.meta.defaultTempo);
                this.updateTempoDisplay();
            }
            this.engine.start();
        }
    }

    /**
     * Show browser view
     */
    showBrowser() {
        this.elements.browser?.classList.remove('hidden');
        this.elements.player?.classList.add('hidden');
    }

    /**
     * Show player view
     */
    showPlayer() {
        this.elements.browser?.classList.add('hidden');
        this.elements.player?.classList.remove('hidden');
    }

    /**
     * Update tutorial info display
     */
    updateInfo(tutorial) {
        if (this.elements.title) {
            this.elements.title.textContent = tutorial.meta?.title || tutorial.title || '-';
        }
        if (this.elements.artist) {
            this.elements.artist.textContent = tutorial.meta?.artist || tutorial.artist || '-';
        }
    }

    /**
     * Update progress display
     */
    updateProgress() {
        const progress = this.engine.getProgress();

        if (this.elements.progressFill) {
            this.elements.progressFill.style.width = `${progress.percentage}%`;
        }
        if (this.elements.progressText) {
            this.elements.progressText.textContent = `${progress.current} / ${progress.total}`;
        }
    }

    /**
     * Update hint display
     */
    updateHint(hint) {
        if (this.elements.hintNote) {
            this.elements.hintNote.textContent = hint.swara;
        }
        if (this.elements.hintKey) {
            this.elements.hintKey.textContent = hint.key ? `Key: ${hint.key}` : '-';
        }
        if (this.elements.lyrics) {
            this.elements.lyrics.textContent = hint.lyrics || '-';
        }
    }

    /**
     * Update tempo display
     */
    updateTempoDisplay() {
        const tempo = state.get('tutorial.tempo');
        if (this.elements.tempoValue) {
            this.elements.tempoValue.textContent = `${tempo} BPM`;
        }
    }

    /**
     * Show completion message
     */
    showCompletion(result) {
        // Create completion overlay
        const overlay = document.createElement('div');
        overlay.className = 'completion-overlay';
        overlay.innerHTML = `
            <div class="completion-message">
                <h3 class="completion-message__title">Well Done!</h3>
                <p class="completion-message__text">You completed the tutorial!</p>
                <div class="tutorial-score">
                    <div class="score-item">
                        <span class="score-item__value score-item__value--correct">${result.score}</span>
                        <span class="score-item__label">Correct</span>
                    </div>
                    <div class="score-item">
                        <span class="score-item__value score-item__value--wrong">${result.mistakes}</span>
                        <span class="score-item__label">Mistakes</span>
                    </div>
                    <div class="score-item">
                        <span class="score-item__value">${result.accuracy}%</span>
                        <span class="score-item__label">Accuracy</span>
                    </div>
                </div>
                <div class="completion-actions">
                    <button class="btn" id="completion-retry">Try Again</button>
                    <button class="btn btn--secondary" id="completion-exit">Exit</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // Add click handlers
        overlay.querySelector('#completion-retry')?.addEventListener('click', () => {
            overlay.remove();
            this.engine.reset();
            this.engine.start();
        });

        overlay.querySelector('#completion-exit')?.addEventListener('click', () => {
            overlay.remove();
            this.engine.stop();
            this.showBrowser();
        });

        // Click outside to close
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
                this.showBrowser();
            }
        });
    }
}

export default TutorialUI;
