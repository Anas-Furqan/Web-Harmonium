// AudioEngine - Core audio context and playback management

import { eventBus, EVENTS } from '../utils/EventBus.js';
import { state } from '../utils/StateManager.js';
import { AUDIO_DEFAULTS } from '../config.js';

export class AudioEngine {
    constructor() {
        this.context = null;
        this.masterGain = null;
        this.reverbGain = null;
        this.convolver = null;
        this.sampleBuffer = null;
        this.voices = new Map(); // midiNote -> { source, gain }
        this.isReady = false;
    }

    /**
     * Initialize audio context (must be called after user gesture)
     */
    async init() {
        try {
            // Create audio context
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.context = new AudioContext();

            // Create master gain node
            this.masterGain = this.context.createGain();
            this.masterGain.gain.value = state.get('audio.volume');
            this.masterGain.connect(this.context.destination);

            // Create reverb chain
            this.reverbGain = this.context.createGain();
            this.reverbGain.gain.value = 0; // Off by default
            this.reverbGain.connect(this.context.destination);

            // Load sample
            await this.loadSample();

            // Load reverb impulse response
            await this.loadReverb();

            this.isReady = true;
            state.set('audio.isReady', true);
            eventBus.emit(EVENTS.AUDIO_READY);

            console.log('Audio engine initialized');
            return true;
        } catch (error) {
            console.error('Failed to initialize audio engine:', error);
            return false;
        }
    }

    /**
     * Load the harmonium sample
     */
    async loadSample() {
        try {
            // Try to load from samples folder, fall back to generating a tone
            const response = await fetch('samples/harmonium/harmonium.mp3');
            if (response.ok) {
                const arrayBuffer = await response.arrayBuffer();
                this.sampleBuffer = await this.context.decodeAudioData(arrayBuffer);
                console.log('Loaded harmonium sample');
            } else {
                throw new Error('Sample not found');
            }
        } catch (error) {
            console.warn('Could not load sample, generating synthetic tone:', error);
            this.sampleBuffer = this.generateSyntheticSample();
        }
    }

    /**
     * Generate a synthetic harmonium-like sample
     */
    generateSyntheticSample() {
        const sampleRate = this.context.sampleRate;
        const duration = 2; // 2 seconds
        const length = sampleRate * duration;
        const buffer = this.context.createBuffer(1, length, sampleRate);
        const data = buffer.getChannelData(0);

        // Base frequency for C4 (middle C)
        const baseFreq = 261.63;

        // Generate harmonium-like sound with multiple harmonics
        for (let i = 0; i < length; i++) {
            const t = i / sampleRate;
            let sample = 0;

            // Fundamental + harmonics (characteristic of reed instruments)
            sample += 0.5 * Math.sin(2 * Math.PI * baseFreq * t);        // Fundamental
            sample += 0.3 * Math.sin(2 * Math.PI * baseFreq * 2 * t);    // 2nd harmonic
            sample += 0.2 * Math.sin(2 * Math.PI * baseFreq * 3 * t);    // 3rd harmonic
            sample += 0.15 * Math.sin(2 * Math.PI * baseFreq * 4 * t);   // 4th harmonic
            sample += 0.1 * Math.sin(2 * Math.PI * baseFreq * 5 * t);    // 5th harmonic
            sample += 0.05 * Math.sin(2 * Math.PI * baseFreq * 6 * t);   // 6th harmonic

            // Slight tremolo for bellows effect
            const tremolo = 1 + 0.02 * Math.sin(2 * Math.PI * 5 * t);
            sample *= tremolo;

            // Normalize
            sample *= 0.3;

            data[i] = sample;
        }

        return buffer;
    }

    /**
     * Load reverb impulse response
     */
    async loadReverb() {
        try {
            this.convolver = this.context.createConvolver();

            const response = await fetch('samples/fx/reverb.mp3');
            if (response.ok) {
                const arrayBuffer = await response.arrayBuffer();
                this.convolver.buffer = await this.context.decodeAudioData(arrayBuffer);
            } else {
                // Generate simple reverb
                this.convolver.buffer = this.generateReverbImpulse();
            }

            this.convolver.connect(this.reverbGain);
            console.log('Reverb loaded');
        } catch (error) {
            console.warn('Could not load reverb:', error);
            this.convolver = null;
        }
    }

    /**
     * Generate a simple reverb impulse response
     */
    generateReverbImpulse() {
        const sampleRate = this.context.sampleRate;
        const length = sampleRate * 2; // 2 second reverb
        const buffer = this.context.createBuffer(2, length, sampleRate);

        for (let channel = 0; channel < 2; channel++) {
            const data = buffer.getChannelData(channel);
            for (let i = 0; i < length; i++) {
                // Exponential decay with noise
                data[i] = (Math.random() * 2 - 1) * Math.exp(-3 * i / length);
            }
        }

        return buffer;
    }

    /**
     * Play a note
     */
    noteOn(midiNote, velocity = 100) {
        if (!this.isReady || !this.sampleBuffer) return;

        // Stop existing voice for this note
        this.noteOff(midiNote);

        // Calculate pitch shift from root note (C4 = 60)
        const rootNote = AUDIO_DEFAULTS.sampleRoot;
        const transpose = state.get('audio.transpose') || 0;
        const octaveShift = (state.get('audio.octave') - 3) * 12; // Octave 3 is middle
        const semitones = midiNote - rootNote + transpose + octaveShift;
        const playbackRate = Math.pow(2, semitones / 12);

        // Create source node
        const source = this.context.createBufferSource();
        source.buffer = this.sampleBuffer;
        source.loop = true;
        source.loopStart = 0.1;
        source.loopEnd = this.sampleBuffer.duration - 0.1;
        source.playbackRate.value = playbackRate;

        // Create gain node for envelope
        const gain = this.context.createGain();
        const velocityGain = (velocity / 127) * 0.8;

        // Attack envelope
        const now = this.context.currentTime;
        const attack = AUDIO_DEFAULTS.attack;
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(velocityGain, now + attack);

        // Connect
        source.connect(gain);
        gain.connect(this.masterGain);

        // Connect to reverb if enabled
        if (this.convolver && state.get('audio.reverb')) {
            gain.connect(this.convolver);
        }

        // Handle reed stacking (multiple octaves)
        const reedStack = state.get('audio.reedStack') || 1;
        const additionalSources = [];

        if (reedStack >= 2) {
            // Add octave above
            const source2 = this.createStackedSource(playbackRate * 2, velocityGain * 0.5);
            source2.connect(gain);
            additionalSources.push(source2);
        }

        if (reedStack >= 3) {
            // Add octave below
            const source3 = this.createStackedSource(playbackRate / 2, velocityGain * 0.3);
            source3.connect(gain);
            additionalSources.push(source3);
        }

        // Start all sources
        source.start();
        additionalSources.forEach(s => s.start());

        // Store voice reference
        this.voices.set(midiNote, {
            source,
            gain,
            additionalSources,
        });

        eventBus.emit(EVENTS.NOTE_ON, midiNote, velocity);
    }

    /**
     * Create a stacked source for reed layering
     */
    createStackedSource(playbackRate, gain) {
        const source = this.context.createBufferSource();
        source.buffer = this.sampleBuffer;
        source.loop = true;
        source.loopStart = 0.1;
        source.loopEnd = this.sampleBuffer.duration - 0.1;
        source.playbackRate.value = playbackRate;

        const gainNode = this.context.createGain();
        gainNode.gain.value = gain;

        source.connect(gainNode);
        gainNode.connect(this.masterGain);

        return source;
    }

    /**
     * Stop a note
     */
    noteOff(midiNote) {
        const voice = this.voices.get(midiNote);
        if (!voice) return;

        const { source, gain, additionalSources } = voice;
        const now = this.context.currentTime;
        const release = AUDIO_DEFAULTS.release;

        // Release envelope
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(gain.gain.value, now);
        gain.gain.linearRampToValueAtTime(0, now + release);

        // Stop sources after release
        setTimeout(() => {
            try {
                source.stop();
                additionalSources?.forEach(s => s.stop());
            } catch (e) {
                // Source may have already stopped
            }
        }, release * 1000 + 50);

        this.voices.delete(midiNote);
        eventBus.emit(EVENTS.NOTE_OFF, midiNote);
    }

    /**
     * Stop all notes
     */
    allNotesOff() {
        for (const midiNote of this.voices.keys()) {
            this.noteOff(midiNote);
        }
    }

    /**
     * Set master volume
     */
    setVolume(value) {
        if (this.masterGain) {
            this.masterGain.gain.value = value;
        }
        state.set('audio.volume', value);
        eventBus.emit(EVENTS.VOLUME_CHANGE, value);
    }

    /**
     * Toggle reverb
     */
    setReverb(enabled) {
        if (this.reverbGain) {
            this.reverbGain.gain.value = enabled ? 0.3 : 0;
        }
        state.set('audio.reverb', enabled);
        eventBus.emit(EVENTS.REVERB_CHANGE, enabled);
    }

    /**
     * Set transpose
     */
    setTranspose(semitones) {
        state.set('audio.transpose', Math.max(-11, Math.min(11, semitones)));
        eventBus.emit(EVENTS.TRANSPOSE_CHANGE, semitones);
    }

    /**
     * Set octave
     */
    setOctave(octave) {
        state.set('audio.octave', Math.max(0, Math.min(6, octave)));
        eventBus.emit(EVENTS.OCTAVE_CHANGE, octave);
    }

    /**
     * Set reed stack
     */
    setReedStack(count) {
        state.set('audio.reedStack', Math.max(1, Math.min(3, count)));
        eventBus.emit(EVENTS.REED_CHANGE, count);
    }

    /**
     * Resume audio context (after user gesture)
     */
    async resume() {
        if (this.context && this.context.state === 'suspended') {
            await this.context.resume();
        }
    }

    /**
     * Suspend audio context (save battery)
     */
    async suspend() {
        if (this.context && this.context.state === 'running') {
            await this.context.suspend();
        }
    }

    /**
     * Check if audio is ready
     */
    get ready() {
        return this.isReady;
    }
}

export default AudioEngine;
