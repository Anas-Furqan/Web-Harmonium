// SwaraMapper - Advanced note to swara conversion with octave handling

import { SWARA_MAP, NOTE_NAMES } from '../config.js';

export class SwaraMapper {
    constructor(rootNote = 60) {
        this.rootNote = rootNote; // Default: C4 = Sa
    }

    /**
     * Convert MIDI note to swara
     */
    midiToSwara(midiNote) {
        const semitone = midiNote % 12;
        const octaveOffset = Math.floor((midiNote - this.rootNote) / 12);
        let swara = SWARA_MAP[semitone];

        // Add octave markers
        if (octaveOffset > 0) {
            // Upper octave: add prime (') marks
            swara = swara + "'".repeat(octaveOffset);
        } else if (octaveOffset < 0) {
            // Lower octave: add dots before
            swara = '.'.repeat(Math.abs(octaveOffset)) + swara;
        }

        return swara;
    }

    /**
     * Convert swara to MIDI note
     */
    swaraToMidi(swara) {
        // Handle octave markers
        let octaveOffset = 0;
        let baseSwar = swara;

        // Count upper octave markers (')
        const upperMatch = swara.match(/'+$/);
        if (upperMatch) {
            octaveOffset = upperMatch[0].length;
            baseSwar = swara.slice(0, -octaveOffset);
        }

        // Count lower octave markers (.)
        const lowerMatch = swara.match(/^\.+/);
        if (lowerMatch) {
            octaveOffset = -lowerMatch[0].length;
            baseSwar = swara.slice(Math.abs(octaveOffset));
        }

        // Find semitone from swara map
        let semitone = null;
        for (const [key, value] of Object.entries(SWARA_MAP)) {
            if (value === baseSwar) {
                semitone = parseInt(key);
                break;
            }
        }

        if (semitone === null) return null;

        // Calculate MIDI note
        const rootOctave = Math.floor(this.rootNote / 12);
        return (rootOctave + octaveOffset) * 12 + semitone;
    }

    /**
     * Get Western note name from MIDI
     */
    getNoteName(midiNote) {
        const noteName = NOTE_NAMES[midiNote % 12];
        const octave = Math.floor(midiNote / 12) - 1;
        return `${noteName}${octave}`;
    }

    /**
     * Get swara info with full details
     */
    getSwaraInfo(midiNote) {
        const swara = this.midiToSwara(midiNote);
        const noteName = this.getNoteName(midiNote);
        const semitone = midiNote % 12;
        const octave = Math.floor(midiNote / 12) - 1;

        // Determine swara type
        const swaraType = this.getSwaraType(semitone);

        return {
            swara,
            noteName,
            midiNote,
            semitone,
            octave,
            type: swaraType
        };
    }

    /**
     * Get swara type (shuddha, komal, tivra)
     */
    getSwaraType(semitone) {
        const komalNotes = [1, 3, 8, 10]; // r, g, d, n
        const tivraNotes = [6]; // M

        if (komalNotes.includes(semitone)) return 'komal';
        if (tivraNotes.includes(semitone)) return 'tivra';
        return 'shuddha';
    }

    /**
     * Parse notation string into swara array
     */
    parseNotation(notation) {
        // Split by spaces and filter empty
        const tokens = notation.split(/\s+/).filter(Boolean);
        return tokens.map(token => ({
            swara: token,
            midi: this.swaraToMidi(token)
        })).filter(item => item.midi !== null);
    }

    /**
     * Format swara array to string
     */
    formatNotation(swaras, separator = ' ') {
        return swaras.join(separator);
    }

    /**
     * Set root note for Sa
     */
    setRoot(midiNote) {
        this.rootNote = midiNote;
    }
}

export default SwaraMapper;
