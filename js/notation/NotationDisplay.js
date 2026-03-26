// NotationDisplay - Real-time swara notation display and management

import { eventBus, EVENTS } from '../utils/EventBus.js';
import { state } from '../utils/StateManager.js';
import { SwaraMapper } from './SwaraMapper.js';

export class NotationDisplay {
    constructor(displayElement) {
        this.element = displayElement;
        this.mapper = new SwaraMapper();
        this.notation = [];
        this.maxDisplay = 100; // Max swaras to display
    }

    /**
     * Initialize the display
     */
    init() {
        // Listen for notation events
        eventBus.on(EVENTS.NOTATION_ADD, (swara) => {
            this.addSwara(swara);
        });

        eventBus.on(EVENTS.NOTATION_CLEAR, () => {
            this.clear();
        });

        // Initial render
        this.render();
    }

    /**
     * Add a swara to the notation
     */
    addSwara(swara) {
        this.notation.push(swara);

        // Limit displayed notation
        if (this.notation.length > this.maxDisplay) {
            this.notation = this.notation.slice(-this.maxDisplay);
        }

        this.render();
    }

    /**
     * Clear notation
     */
    clear() {
        this.notation = [];
        this.render();
    }

    /**
     * Render the notation display
     */
    render() {
        if (!this.element) return;

        if (this.notation.length === 0) {
            this.element.innerHTML = '<p class="notation-placeholder">Play notes to see swara notation...</p>';
            return;
        }

        // Group swaras for display
        const displayHTML = this.notation.map((swara, index) => {
            const classes = ['notation-swara'];

            // Add class based on swara type
            if (swara.startsWith('.')) {
                classes.push('notation-swara--lower');
            } else if (swara.includes("'")) {
                classes.push('notation-swara--upper');
            }

            // Check if komal or tivra
            const baseSwar = swara.replace(/^\.+/, '').replace(/'+$/, '');
            if (['r', 'g', 'd', 'n'].includes(baseSwar)) {
                classes.push('notation-swara--komal');
            } else if (baseSwar === 'M') {
                classes.push('notation-swara--tivra');
            }

            return `<span class="${classes.join(' ')}" data-index="${index}">${this.formatSwara(swara)}</span>`;
        }).join('');

        this.element.innerHTML = `<div class="notation-content">${displayHTML}</div>`;

        // Scroll to end
        this.element.scrollLeft = this.element.scrollWidth;
    }

    /**
     * Format swara for display with better octave markers
     */
    formatSwara(swara) {
        // Replace ' with superscript dot and . prefix with subscript dot
        let formatted = swara;

        // Upper octave: S' -> S·
        if (formatted.includes("'")) {
            const count = (formatted.match(/'/g) || []).length;
            formatted = formatted.replace(/'+$/, '') + '<sup>' + '·'.repeat(count) + '</sup>';
        }

        // Lower octave: .S -> ·S
        if (formatted.startsWith('.')) {
            const count = (formatted.match(/^\./g) || []).length;
            formatted = '<sub>' + '·'.repeat(count) + '</sub>' + formatted.replace(/^\.+/, '');
        }

        return formatted;
    }

    /**
     * Get notation as plain text
     */
    getNotationText() {
        return this.notation.join(' ');
    }

    /**
     * Get notation array
     */
    getNotation() {
        return [...this.notation];
    }

    /**
     * Load notation from array
     */
    loadNotation(swaras) {
        this.notation = [...swaras];
        this.render();
    }

    /**
     * Export notation as JSON
     */
    exportJSON() {
        return {
            notation: this.notation,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Import notation from JSON
     */
    importJSON(data) {
        if (data && Array.isArray(data.notation)) {
            this.notation = data.notation;
            this.render();
        }
    }
}

export default NotationDisplay;
