// Config - Key mappings, swara definitions, and constants

// Keyboard layout dimensions
export const KEYBOARD_CONFIG = {
    width: 800,
    height: 200,
    whiteKeyWidth: 38,
    whiteKeyHeight: 180,
    blackKeyWidth: 24,
    blackKeyHeight: 110,
    keyGap: 2,
    borderRadius: 4,
    startNote: 48,  // C3
    endNote: 77,    // F5 (extend range a bit)
};

// Default audio settings
export const AUDIO_DEFAULTS = {
    volume: 0.7,
    reverb: false,
    transpose: 0,
    octave: 3,
    reedStack: 1,
    attack: 0.01,
    release: 0.3,
    sampleRoot: 60,  // Middle C sample
};

// Computer keyboard to MIDI note mapping (based on original harmonium)
// Layout follows QWERTY keyboard matching standard harmonium layout
export const KEY_MAP = {
    // Lower octave keys (left side)
    'KeyA': 53,      // F3
    'KeyS': 54,      // F#3
    'Backquote': 55, // G3 (`)
    'Digit1': 56,    // G#3
    'KeyQ': 57,      // A3
    'Digit2': 58,    // A#3
    'KeyW': 59,      // B3

    // Middle octave (main playing area)
    'KeyE': 60,      // C4 - Sa (Middle C)
    'Digit4': 61,    // C#4 - Komal Re
    'KeyR': 62,      // D4 - Re
    'Digit5': 63,    // D#4 - Komal Ga
    'KeyT': 64,      // E4 - Ga
    'KeyY': 65,      // F4 - Ma
    'Digit7': 66,    // F#4 - Tivra Ma
    'KeyU': 67,      // G4 - Pa
    'Digit8': 68,    // G#4 - Komal Dha
    'KeyI': 69,      // A4 - Dha
    'Digit9': 70,    // A#4 - Komal Ni
    'KeyO': 71,      // B4 - Ni

    // Upper octave keys (right side)
    'KeyP': 72,      // C5 - Upper Sa
    'Minus': 73,     // C#5
    'BracketLeft': 74,   // D5 - Upper Re
    'Equal': 75,     // D#5
    'BracketRight': 76,  // E5 - Upper Ga
    'Backslash': 77,     // F5 - Upper Ma
};

// Reverse mapping: MIDI note to keyboard key (for displaying hints)
export const NOTE_TO_KEY = Object.fromEntries(
    Object.entries(KEY_MAP).map(([key, note]) => [note, key])
);

// Display-friendly key names
export const KEY_DISPLAY_NAMES = {
    'KeyA': 'A',
    'KeyS': 'S',
    'Backquote': '`',
    'Digit1': '1',
    'KeyQ': 'Q',
    'Digit2': '2',
    'KeyW': 'W',
    'KeyE': 'E',
    'Digit4': '4',
    'KeyR': 'R',
    'Digit5': '5',
    'KeyT': 'T',
    'KeyY': 'Y',
    'Digit7': '7',
    'KeyU': 'U',
    'Digit8': '8',
    'KeyI': 'I',
    'Digit9': '9',
    'KeyO': 'O',
    'KeyP': 'P',
    'Minus': '-',
    'BracketLeft': '[',
    'Equal': '=',
    'BracketRight': ']',
    'Backslash': '\\',
};

// Indian swaras (notes) mapping
// Base swara for each semitone in an octave (starting from C)
export const SWARA_MAP = {
    0: 'S',   // Sa (Shuddha)
    1: 'r',   // Re (Komal) - lowercase indicates flat
    2: 'R',   // Re (Shuddha)
    3: 'g',   // Ga (Komal)
    4: 'G',   // Ga (Shuddha)
    5: 'm',   // Ma (Shuddha)
    6: 'M',   // Ma (Tivra) - uppercase M indicates sharp
    7: 'P',   // Pa (constant, no komal/tivra)
    8: 'd',   // Dha (Komal)
    9: 'D',   // Dha (Shuddha)
    10: 'n',  // Ni (Komal)
    11: 'N',  // Ni (Shuddha)
};

// Note names (Western)
export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Convert MIDI note to swara with octave markers
export function midiToSwara(midiNote, rootNote = 60) {
    const semitone = midiNote % 12;
    const octaveOffset = Math.floor((midiNote - rootNote) / 12);
    let swara = SWARA_MAP[semitone];

    // Add dots for octave indication
    // Upper dot for higher octave, lower dot for lower
    if (octaveOffset > 0) {
        swara = swara + "'".repeat(octaveOffset); // Prime (') for upper octave
    } else if (octaveOffset < 0) {
        swara = '.' + swara; // Dot prefix for lower octave
    }

    return swara;
}

// Get display-friendly keyboard key for a MIDI note
export function getKeyDisplayForNote(midiNote) {
    const keyCode = NOTE_TO_KEY[midiNote];
    return keyCode ? KEY_DISPLAY_NAMES[keyCode] || keyCode : '';
}

// Check if a MIDI note corresponds to a black key
export function isBlackKey(midiNote) {
    const n = midiNote % 12;
    return [1, 3, 6, 8, 10].includes(n);
}

// Get note name with octave
export function getNoteNameWithOctave(midiNote) {
    const noteName = NOTE_NAMES[midiNote % 12];
    const octave = Math.floor(midiNote / 12) - 1;
    return `${noteName}${octave}`;
}

// Tutorial categories
export const TUTORIAL_CATEGORIES = [
    { id: 'all', name: 'All' },
    { id: 'practice', name: 'Practice' },
    { id: 'indie', name: 'Indie' },
    { id: 'bollywood', name: 'Bollywood' },
    { id: 'trending', name: 'Trending' },
];

// Difficulty levels
export const DIFFICULTY_LEVELS = {
    beginner: { label: 'Beginner', color: '#4CAF50' },
    intermediate: { label: 'Intermediate', color: '#FFD700' },
    advanced: { label: 'Advanced', color: '#f44336' },
};

// Tutorial modes
export const TUTORIAL_MODES = {
    WAIT: 'wait',           // Wait for correct key before advancing
    AUTOPLAY: 'autoplay',   // Auto-play demonstration
    PRACTICE: 'practice',   // Play along, track mistakes
};

// Default tutorial settings
export const TUTORIAL_DEFAULTS = {
    tempo: 80,
    mode: TUTORIAL_MODES.WAIT,
};

// Storage keys
export const STORAGE_KEYS = {
    SETTINGS: 'webharmonium_settings',
    NOTATION: 'webharmonium_notation',
    PROGRESS: 'webharmonium_progress',
};
