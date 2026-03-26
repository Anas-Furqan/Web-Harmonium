// KeyboardRenderer - SVG keyboard generation

import { KEYBOARD_CONFIG, isBlackKey, midiToSwara, getNoteNameWithOctave } from '../config.js';

export class KeyboardRenderer {
    constructor(container) {
        this.container = container;
        this.svg = null;
        this.keys = new Map(); // midiNote -> SVG element
    }

    /**
     * Render the SVG keyboard
     * @returns {SVGElement}
     */
    render() {
        const { width, height, startNote, endNote } = KEYBOARD_CONFIG;

        // Create SVG element
        this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        this.svg.setAttribute('class', 'harmonium-keyboard');
        this.svg.setAttribute('role', 'application');
        this.svg.setAttribute('aria-label', 'Harmonium keyboard');
        this.svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

        // Calculate white keys in range
        const whiteKeys = [];
        const blackKeys = [];

        for (let note = startNote; note <= endNote; note++) {
            if (isBlackKey(note)) {
                blackKeys.push(note);
            } else {
                whiteKeys.push(note);
            }
        }

        // Calculate actual width based on white keys
        const { whiteKeyWidth, keyGap } = KEYBOARD_CONFIG;
        const totalWhiteKeys = whiteKeys.length;
        const actualWidth = totalWhiteKeys * (whiteKeyWidth + keyGap);

        // Update viewBox to fit
        this.svg.setAttribute('viewBox', `0 0 ${actualWidth} ${height}`);

        // Render white keys first (they go underneath)
        whiteKeys.forEach((note, index) => {
            const keyElement = this.createWhiteKey(note, index);
            this.svg.appendChild(keyElement);
            this.keys.set(note, keyElement);
        });

        // Render black keys on top
        blackKeys.forEach(note => {
            const keyElement = this.createBlackKey(note, whiteKeys);
            this.svg.appendChild(keyElement);
            this.keys.set(note, keyElement);
        });

        // Add to container
        this.container.innerHTML = '';
        this.container.appendChild(this.svg);

        return this.svg;
    }

    /**
     * Create a white key
     */
    createWhiteKey(midiNote, index) {
        const { whiteKeyWidth, whiteKeyHeight, keyGap, borderRadius } = KEYBOARD_CONFIG;
        const x = index * (whiteKeyWidth + keyGap);

        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', x);
        rect.setAttribute('y', 0);
        rect.setAttribute('width', whiteKeyWidth);
        rect.setAttribute('height', whiteKeyHeight);
        rect.setAttribute('rx', borderRadius);
        rect.setAttribute('ry', borderRadius);
        rect.setAttribute('class', 'key key--white');
        rect.setAttribute('data-midi', midiNote);
        rect.setAttribute('data-swara', midiToSwara(midiNote));
        rect.setAttribute('role', 'button');
        rect.setAttribute('aria-label', `${getNoteNameWithOctave(midiNote)} - ${midiToSwara(midiNote)}`);
        rect.setAttribute('tabindex', '0');

        // Add swara label
        const label = this.createLabel(midiNote, x + whiteKeyWidth / 2, whiteKeyHeight - 20, false);

        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.appendChild(rect);
        group.appendChild(label);
        group.setAttribute('data-midi', midiNote);
        group.classList.add('key-group');

        return group;
    }

    /**
     * Create a black key
     */
    createBlackKey(midiNote, whiteKeys) {
        const { whiteKeyWidth, blackKeyWidth, blackKeyHeight, keyGap, borderRadius } = KEYBOARD_CONFIG;

        // Find position between white keys
        // Black key sits between the white key before it and the current white key position
        const prevWhiteNote = this.getPreviousWhiteKey(midiNote);
        const whiteIndex = whiteKeys.indexOf(prevWhiteNote);

        // Position black key at the right edge of the previous white key
        const x = (whiteIndex + 1) * (whiteKeyWidth + keyGap) - (blackKeyWidth / 2) - (keyGap / 2);

        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', x);
        rect.setAttribute('y', 0);
        rect.setAttribute('width', blackKeyWidth);
        rect.setAttribute('height', blackKeyHeight);
        rect.setAttribute('rx', borderRadius - 1);
        rect.setAttribute('ry', borderRadius - 1);
        rect.setAttribute('class', 'key key--black');
        rect.setAttribute('data-midi', midiNote);
        rect.setAttribute('data-swara', midiToSwara(midiNote));
        rect.setAttribute('role', 'button');
        rect.setAttribute('aria-label', `${getNoteNameWithOctave(midiNote)} - ${midiToSwara(midiNote)}`);
        rect.setAttribute('tabindex', '0');

        // Add swara label
        const label = this.createLabel(midiNote, x + blackKeyWidth / 2, blackKeyHeight - 15, true);

        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.appendChild(rect);
        group.appendChild(label);
        group.setAttribute('data-midi', midiNote);
        group.classList.add('key-group');

        return group;
    }

    /**
     * Create swara label for a key
     */
    createLabel(midiNote, x, y, isBlack) {
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', x);
        text.setAttribute('y', y);
        text.setAttribute('class', `key-label key-label--${isBlack ? 'black' : 'white'}`);
        text.textContent = midiToSwara(midiNote);
        return text;
    }

    /**
     * Get the previous white key for a black key
     */
    getPreviousWhiteKey(blackNote) {
        // Black keys: 1, 3, 6, 8, 10 in octave
        // They appear after: 0, 2, 5, 7, 9
        return blackNote - 1;
    }

    /**
     * Get key element by MIDI note
     */
    getKeyElement(midiNote) {
        const group = this.keys.get(midiNote);
        return group ? group.querySelector('.key') : null;
    }

    /**
     * Get all key elements
     */
    getAllKeys() {
        return this.keys;
    }

    /**
     * Enable tutorial mode (shows labels more prominently)
     */
    enableTutorialMode() {
        this.svg?.classList.add('keyboard--tutorial');
    }

    /**
     * Disable tutorial mode
     */
    disableTutorialMode() {
        this.svg?.classList.remove('keyboard--tutorial');
    }
}

export default KeyboardRenderer;
